import { performance } from "node:perf_hooks";
import {
  createCharacterCacheKey,
  createCacheReferenceBucket,
  createEvidenceCacheKey,
  InMemoryEvidenceCache,
  InMemoryTtlStore,
  type EvidenceCacheAdapter,
  type EvidenceCacheIdentity,
  type SyncCacheStore,
  type V2CharacterCache,
  type V2EvidenceCache,
} from "./cache";
import { collectGitHubEvidenceV21, type GitHubEvidenceCollectorV21Options, type GitTreeSnapshot } from "./collectorV21";
import { createRPGCharacterV2 } from "./engine";
import type { DeveloperProfile } from "@/game/types";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "./types";

export type V2DeliveryState = "ready" | "stale" | "enriching" | "partial" | "unavailable";
export type V2DeliverySource = "l1" | "l2" | "fresh-enrichment" | "fallback";

export interface V2DeliveryResult {
  state: V2DeliveryState;
  character: RPGCharacterV2 | null;
  cache: "hit" | "stale" | "miss" | "coalesced";
  source: V2DeliverySource;
  durationMs: number;
  enrichmentStarted?: boolean;
}

export interface V2DeliveryCachePolicy {
  evidenceTtlMs: number;
  evidenceStaleTtlMs: number;
  characterTtlMs: number;
  characterStaleTtlMs: number;
}

export interface V2EnrichmentBudget { softMs: number; hardMs: number }

export interface V2DeliveryMetrics {
  cacheL1Hit: number;
  cacheL2Hit: number;
  cacheMiss: number;
  staleServed: number;
  enrichmentStarted: number;
  enrichmentCompleted: number;
  enrichmentFailed: number;
  enrichmentAborted: number;
  durationMs: number[];
}

type MetricName = keyof Omit<V2DeliveryMetrics, "durationMs"> | "softBudgetExceeded" | "durationMs";

export interface V2DeliveryServiceOptions {
  evidenceCache?: V2EvidenceCache;
  characterCache?: V2CharacterCache;
  collector?: (username: string, options: GitHubEvidenceCollectorV21Options) => Promise<TechnologyEvidenceProfile>;
  collectorOptions?: Omit<GitHubEvidenceCollectorV21Options, "referenceDate" | "sourceFingerprint" | "cache" | "treeCache" | "manifestCache" | "signal">;
  policy?: Partial<V2DeliveryCachePolicy>;
  budget?: Partial<V2EnrichmentBudget>;
  maxConcurrentEnrichments?: number;
  onMetric?: (name: MetricName, value: number) => void;
}

export interface V2EnrichmentInput { profile: DeveloperProfile; sourceFingerprint: string }
export type V2BackgroundScheduler = (task: Promise<void>) => void;

const DEFAULT_POLICY: V2DeliveryCachePolicy = {
  evidenceTtlMs: 6 * 60 * 60 * 1000,
  evidenceStaleTtlMs: 18 * 60 * 60 * 1000,
  characterTtlMs: 60 * 60 * 1000,
  characterStaleTtlMs: 23 * 60 * 60 * 1000,
};
const DEFAULT_BUDGET: V2EnrichmentBudget = { softMs: 20_000, hardMs: 55_000 };

export class V2EnrichmentAbortedError extends Error {
  constructor() {
    super("v2_enrichment_hard_budget_exceeded");
    this.name = "V2EnrichmentAbortedError";
  }
}

function stateFor(character: RPGCharacterV2): "ready" | "partial" | "unavailable" {
  const coverage = character.explanation.subclass.coverage;
  return coverage === "unavailable" ? "unavailable" : coverage === "partial" ? "partial" : "ready";
}

/** Experimental server-only delivery boundary. Public V1 never imports this service. */
export class V2DeliveryService {
  private readonly evidenceCache: V2EvidenceCache;
  private readonly characterCache: V2CharacterCache;
  private readonly collector: NonNullable<V2DeliveryServiceOptions["collector"]>;
  private readonly collectorOptions: NonNullable<V2DeliveryServiceOptions["collectorOptions"]>;
  private readonly policy: V2DeliveryCachePolicy;
  private readonly budget: V2EnrichmentBudget;
  private readonly maxConcurrentEnrichments: number;
  private readonly onMetric?: V2DeliveryServiceOptions["onMetric"];
  private readonly inflight = new Map<string, Promise<RPGCharacterV2>>();
  private readonly background = new Map<string, Promise<void>>();
  private readonly slotWaiters: Array<() => void> = [];
  private activeEnrichments = 0;
  private readonly metrics: V2DeliveryMetrics = {
    cacheL1Hit: 0, cacheL2Hit: 0, cacheMiss: 0, staleServed: 0,
    enrichmentStarted: 0, enrichmentCompleted: 0, enrichmentFailed: 0, enrichmentAborted: 0, durationMs: [],
  };
  private readonly treeCache: SyncCacheStore<string, GitTreeSnapshot> = new InMemoryTtlStore(6 * 60 * 60 * 1000, 2_000);
  private readonly manifestCache: SyncCacheStore<string, string> = new InMemoryTtlStore(24 * 60 * 60 * 1000, 5_000);

  constructor(options: V2DeliveryServiceOptions = {}) {
    this.evidenceCache = options.evidenceCache ?? new InMemoryEvidenceCache<TechnologyEvidenceProfile>();
    this.characterCache = options.characterCache ?? new InMemoryEvidenceCache<RPGCharacterV2>();
    this.collector = options.collector ?? collectGitHubEvidenceV21;
    this.collectorOptions = options.collectorOptions ?? {};
    this.policy = { ...DEFAULT_POLICY, ...options.policy };
    this.budget = { ...DEFAULT_BUDGET, ...options.budget };
    this.maxConcurrentEnrichments = options.maxConcurrentEnrichments ?? 2;
    this.onMetric = options.onMetric;
    if (this.budget.softMs <= 0 || this.budget.hardMs <= this.budget.softMs) throw new Error("invalid_v2_enrichment_budget");
    if (!Number.isInteger(this.maxConcurrentEnrichments) || this.maxConcurrentEnrichments < 1) throw new Error("invalid_v2_enrichment_concurrency");
  }

  private record(name: Exclude<MetricName, "durationMs">, value = 1): void {
    if (name !== "softBudgetExceeded") this.metrics[name] += value;
    this.onMetric?.(name, value);
  }

  private recordDuration(value: number): void {
    this.metrics.durationMs.push(value);
    this.onMetric?.("durationMs", value);
  }

  private identity(input: V2EnrichmentInput): EvidenceCacheIdentity {
    return { username: input.profile.username, sourceFingerprint: input.sourceFingerprint, referenceDate: createCacheReferenceBucket(input.profile.referenceDate) };
  }

  private async safeGet<V>(cache: EvidenceCacheAdapter<V>, key: string) {
    try { return await cache.get(key); } catch { return null; }
  }

  private async safeSet<V>(cache: EvidenceCacheAdapter<V>, key: string, value: V, policy: { ttlMs: number; staleTtlMs: number }): Promise<void> {
    await cache.set(key, value, policy).catch(() => undefined);
  }

  async lookup(input: V2EnrichmentInput): Promise<V2DeliveryResult> {
    const started = performance.now();
    const hit = await this.safeGet(this.characterCache, createCharacterCacheKey(this.identity(input)));
    const elapsed = performance.now() - started;
    this.recordDuration(elapsed);
    if (!hit) {
      this.record("cacheMiss");
      return { state: "enriching", character: null, cache: "miss", source: "fallback", durationMs: Math.round(elapsed) };
    }
    this.record(hit.source === "l2" ? "cacheL2Hit" : "cacheL1Hit");
    if (hit.state === "stale") this.record("staleServed");
    return {
      state: hit.state === "stale" ? "stale" : stateFor(hit.value),
      character: hit.value,
      cache: hit.state === "stale" ? "stale" : "hit",
      source: hit.source ?? "l1",
      durationMs: Math.round(elapsed),
    };
  }

  async deliver(input: V2EnrichmentInput, schedule: V2BackgroundScheduler): Promise<V2DeliveryResult> {
    const result = await this.lookup(input);
    if (result.cache === "hit") return result;
    return { ...result, enrichmentStarted: this.scheduleBackground(input, schedule) };
  }

  private scheduleBackground(input: V2EnrichmentInput, schedule: V2BackgroundScheduler): boolean {
    const key = createCharacterCacheKey(this.identity(input));
    if (this.background.has(key)) return false;
    this.record("enrichmentStarted");
    const task = this.enrich(input)
      .then(() => { this.record("enrichmentCompleted"); })
      .catch((error: unknown) => { this.record(error instanceof V2EnrichmentAbortedError ? "enrichmentAborted" : "enrichmentFailed"); })
      .finally(() => { this.background.delete(key); });
    this.background.set(key, task);
    schedule(task);
    return true;
  }

  async enrich(input: V2EnrichmentInput): Promise<V2DeliveryResult> {
    const started = performance.now();
    const identity = this.identity(input);
    const characterKey = createCharacterCacheKey(identity);
    const cached = await this.safeGet(this.characterCache, characterKey);
    if (cached?.state === "fresh") {
      return { state: stateFor(cached.value), character: cached.value, cache: "hit", source: cached.source ?? "l1", durationMs: Math.round(performance.now() - started) };
    }
    const running = this.inflight.get(characterKey);
    if (running) {
      const character = await running;
      return { state: stateFor(character), character, cache: "coalesced", source: "fresh-enrichment", durationMs: Math.round(performance.now() - started) };
    }
    const promise = this.buildWithinBudget(input, identity, characterKey);
    this.inflight.set(characterKey, promise);
    try {
      const character = await promise;
      return { state: stateFor(character), character, cache: "miss", source: "fresh-enrichment", durationMs: Math.round(performance.now() - started) };
    } finally {
      this.inflight.delete(characterKey);
    }
  }

  private async acquireSlot(): Promise<() => void> {
    if (this.activeEnrichments >= this.maxConcurrentEnrichments) await new Promise<void>((resolve) => this.slotWaiters.push(resolve));
    this.activeEnrichments++;
    return () => { this.activeEnrichments--; this.slotWaiters.shift()?.(); };
  }

  private async buildWithinBudget(input: V2EnrichmentInput, identity: EvidenceCacheIdentity, characterKey: string): Promise<RPGCharacterV2> {
    const release = await this.acquireSlot();
    const controller = new AbortController();
    const softTimer = setTimeout(() => this.record("softBudgetExceeded"), this.budget.softMs);
    const hardTimer = setTimeout(() => controller.abort(), this.budget.hardMs);
    try { return await this.build(input, identity, characterKey, controller.signal); }
    catch (error) { if (controller.signal.aborted) throw new V2EnrichmentAbortedError(); throw error; }
    finally { clearTimeout(softTimer); clearTimeout(hardTimer); release(); }
  }

  private async build(input: V2EnrichmentInput, identity: EvidenceCacheIdentity, characterKey: string, signal: AbortSignal): Promise<RPGCharacterV2> {
    const evidenceKey = createEvidenceCacheKey(identity);
    const evidenceHit = await this.safeGet(this.evidenceCache, evidenceKey);
    const evidence = evidenceHit?.state === "fresh" ? evidenceHit.value : await this.collector(input.profile.username, {
      ...this.collectorOptions,
      referenceDate: input.profile.referenceDate,
      sourceFingerprint: input.sourceFingerprint,
      treeCache: this.treeCache,
      manifestCache: this.manifestCache,
      signal,
    });
    if (signal.aborted) throw new V2EnrichmentAbortedError();
    if ((!evidenceHit || evidenceHit.state === "stale") && evidence.coverage.coverage !== "unavailable") {
      await this.safeSet(this.evidenceCache, evidenceKey, evidence, { ttlMs: this.policy.evidenceTtlMs, staleTtlMs: this.policy.evidenceStaleTtlMs });
    }
    const character = createRPGCharacterV2({ profile: input.profile, evidence });
    if (signal.aborted) throw new V2EnrichmentAbortedError();
    if (evidence.coverage.coverage !== "unavailable") {
      await this.safeSet(this.characterCache, characterKey, character, { ttlMs: this.policy.characterTtlMs, staleTtlMs: this.policy.characterStaleTtlMs });
    }
    return character;
  }

  async invalidate(input: V2EnrichmentInput): Promise<void> {
    const identity = this.identity(input);
    await Promise.all([
      this.evidenceCache.delete(createEvidenceCacheKey(identity)).catch(() => undefined),
      this.characterCache.delete(createCharacterCacheKey(identity)).catch(() => undefined),
    ]);
  }

  get inFlightCount(): number { return this.inflight.size; }
  get backgroundCount(): number { return this.background.size; }
  get activeEnrichmentCount(): number { return this.activeEnrichments; }
  getMetrics(): V2DeliveryMetrics { return { ...this.metrics, durationMs: [...this.metrics.durationMs] }; }
}
