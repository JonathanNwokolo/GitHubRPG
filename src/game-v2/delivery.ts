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
import type { GitHubRequestProtectionContext } from "@/data/contracts";
import type { RepositoryDiscoverySnapshot } from "@/data/sharedDiscovery";
import { getGitHubProjectProtection, type GitHubProjectProtection } from "@/data/github/protection";
import { GitHubRateLimitError, ProjectBudgetDeniedError } from "@/data/github/errors";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "./types";
import { classifyV2Error, emitV2Telemetry } from "./telemetry";

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
  maxQueuedEnrichments?: number;
  onMetric?: (name: MetricName, value: number) => void;
  projectProtection?: GitHubProjectProtection;
}

export interface V2EnrichmentInput {
  profile: DeveloperProfile;
  sourceFingerprint: string;
  repositoryDiscovery?: RepositoryDiscoverySnapshot;
  protection?: GitHubRequestProtectionContext;
  telemetry?: { correlationId: string; subjectId: string; baseDurationMs?: number };
}
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
  private readonly maxQueuedEnrichments: number;
  private readonly onMetric?: V2DeliveryServiceOptions["onMetric"];
  private readonly projectProtection: GitHubProjectProtection;
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
    this.maxQueuedEnrichments = options.maxQueuedEnrichments ?? 4;
    this.onMetric = options.onMetric;
    this.projectProtection = options.projectProtection ?? getGitHubProjectProtection();
    if (this.budget.softMs <= 0 || this.budget.hardMs <= this.budget.softMs) throw new Error("invalid_v2_enrichment_budget");
    if (!Number.isInteger(this.maxConcurrentEnrichments) || this.maxConcurrentEnrichments < 1) throw new Error("invalid_v2_enrichment_concurrency");
    if (!Number.isInteger(this.maxQueuedEnrichments) || this.maxQueuedEnrichments < 0) throw new Error("invalid_v2_enrichment_queue");
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
    this.emit(input, "v2_lookup_started");
    const hit = await this.safeGet(this.characterCache, createCharacterCacheKey(this.identity(input)));
    const elapsed = performance.now() - started;
    this.recordDuration(elapsed);
    if (!hit) {
      this.record("cacheMiss");
      this.emit(input, "v2_cache_miss", { cache_source: "miss", duration_ms: Math.round(elapsed) });
      return { state: "enriching", character: null, cache: "miss", source: "fallback", durationMs: Math.round(elapsed) };
    }
    this.record(hit.source === "l2" ? "cacheL2Hit" : "cacheL1Hit");
    if (hit.state === "stale") this.record("staleServed");
    this.emit(input, hit.state === "stale" ? "v2_stale_served" : "v2_cache_hit", {
      cache_source: hit.state === "stale" ? "stale" : hit.source ?? "l1",
      duration_ms: Math.round(elapsed),
    });
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
    try {
      await this.projectProtection.beforeColdWork(input.profile.username, input.protection);
    } catch (error) {
      if (error instanceof ProjectBudgetDeniedError && result.character) {
        this.emit(input, "v2_cache_served_during_protection", { cache_source: result.state === "stale" ? "stale" : result.source, reason: error.reason });
        return { ...result, enrichmentStarted: false };
      }
      throw error;
    }
    if (this.activeEnrichments >= this.maxConcurrentEnrichments && this.slotWaiters.length >= this.maxQueuedEnrichments) {
      this.emit(input, "project_budget_denied", { reason: "enrichment_concurrency", retry_after_seconds: 5 });
      throw new ProjectBudgetDeniedError("enrichment_concurrency", 5);
    }
    return { ...result, enrichmentStarted: this.scheduleBackground(input, schedule, true) };
  }

  private scheduleBackground(input: V2EnrichmentInput, schedule: V2BackgroundScheduler, protectionChecked = false): boolean {
    const key = createCharacterCacheKey(this.identity(input));
    if (this.background.has(key)) {
      this.emit(input, "v2_enrichment_reused", { cache_source: "miss" });
      return false;
    }
    this.record("enrichmentStarted");
    this.emit(input, "v2_enrichment_started", { cache_source: "miss" });
    const task = this.enrich(input, protectionChecked)
      .then((result) => {
        this.record("enrichmentCompleted");
        this.emit(input, "v2_enrichment_finished", { result: result.state, total_ms: result.durationMs });
      })
      .catch((error: unknown) => {
        const errorKind = classifyV2Error(error);
        this.record(error instanceof V2EnrichmentAbortedError ? "enrichmentAborted" : "enrichmentFailed");
        this.emit(input, errorKind === "timeout" ? "v2_timeout" : errorKind === "github_rate_limit" ? "v2_rate_limited" : "v2_enrichment_failed", { error_kind: errorKind });
      })
      .finally(() => { this.background.delete(key); });
    this.background.set(key, task);
    schedule(task);
    return true;
  }

  async enrich(input: V2EnrichmentInput, protectionChecked = false): Promise<V2DeliveryResult> {
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
    const promise = this.buildProtected(input, identity, characterKey, protectionChecked);
    this.inflight.set(characterKey, promise);
    try {
      const character = await promise;
      await this.projectProtection.observeSuccess(input.protection);
      return { state: stateFor(character), character, cache: "miss", source: "fresh-enrichment", durationMs: Math.round(performance.now() - started) };
    } catch (error) {
      if (error instanceof GitHubRateLimitError) await this.projectProtection.observeRateLimit(error, input.protection);
      else await this.projectProtection.observeProbeFailure(input.protection);
      throw error;
    } finally {
      this.inflight.delete(characterKey);
    }
  }

  private async buildProtected(
    input: V2EnrichmentInput,
    identity: EvidenceCacheIdentity,
    characterKey: string,
    protectionChecked: boolean
  ): Promise<RPGCharacterV2> {
    if (!protectionChecked) await this.projectProtection.beforeColdWork(input.profile.username, input.protection);
    return this.buildWithinBudget(input, identity, characterKey);
  }

  private async acquireSlot(): Promise<() => void> {
    if (this.activeEnrichments >= this.maxConcurrentEnrichments) {
      if (this.slotWaiters.length >= this.maxQueuedEnrichments) throw new ProjectBudgetDeniedError("enrichment_concurrency", 5);
      await new Promise<void>((resolve) => this.slotWaiters.push(resolve));
    }
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
    const collectorStarted = performance.now();
    if (evidenceHit?.state !== "fresh") this.emit(input, "v2_collector_started");
    let collectorErrorReported = false;
    const evidence = evidenceHit?.state === "fresh" ? evidenceHit.value : await this.collector(input.profile.username, {
      ...this.collectorOptions,
      referenceDate: input.profile.referenceDate,
      sourceFingerprint: input.sourceFingerprint,
      repositoryDiscovery: input.repositoryDiscovery,
      treeCache: this.treeCache,
      manifestCache: this.manifestCache,
      signal,
      onError: (error, phase) => {
        if (collectorErrorReported) return;
        collectorErrorReported = true;
        const errorKind = classifyV2Error(error);
        if (error instanceof GitHubRateLimitError) void this.projectProtection.observeRateLimit(error, input.protection);
        this.emit(input, errorKind === "github_rate_limit" ? "v2_rate_limited" : errorKind === "timeout" ? "v2_timeout" : "v2_collector_error", { error_kind: errorKind, phase });
      },
    });
    if (evidence.requests.rateLimitRemaining !== null && evidence.requests.rateLimitRemaining !== undefined && evidence.requests.rateLimitResource) {
      const resetAt = evidence.requests.rateLimitResetAt ? new Date(evidence.requests.rateLimitResetAt) : null;
      await this.projectProtection.observeSnapshot(evidence.requests.rateLimitResource, {
        limit: evidence.requests.rateLimitLimit ?? null,
        remaining: evidence.requests.rateLimitRemaining,
        resetAt: resetAt && !Number.isNaN(resetAt.getTime()) ? resetAt : null,
      }, input.protection);
    }
    if (evidenceHit?.state !== "fresh") this.emit(input, "v2_collector_finished", {
      duration_ms: Math.round(performance.now() - collectorStarted),
      repo_selection_ms: evidence.requests.timingsMs?.repositorySelection ?? null,
      trees_ms: evidence.requests.timingsMs?.treeDiscovery ?? null,
      manifests_ms: evidence.requests.timingsMs?.manifestFetch ?? null,
      normalization_ms: evidence.requests.timingsMs?.parsing ?? null,
      rest_requests: evidence.requests.rest,
      graphql_requests: evidence.requests.graphql,
      tree_requests: evidence.requests.treeRequests ?? 0,
      manifest_requests: evidence.requests.manifestRequests ?? 0,
      fallback_rest_requests: evidence.requests.fallbackRequests ?? 0,
      repository_discovery: evidence.requests.repositoryDiscovery ?? "fetched",
    });
    if (signal.aborted) throw new V2EnrichmentAbortedError();
    if ((!evidenceHit || evidenceHit.state === "stale") && evidence.coverage.coverage !== "unavailable") {
      await this.safeSet(this.evidenceCache, evidenceKey, evidence, { ttlMs: this.policy.evidenceTtlMs, staleTtlMs: this.policy.evidenceStaleTtlMs });
    }
    const scoringStarted = performance.now();
    const character = createRPGCharacterV2({ profile: input.profile, evidence });
    this.emit(input, "v2_enrichment_summary", {
      result: stateFor(character),
      base_ms: input.telemetry?.baseDurationMs ?? null,
      scoring_ms: Math.round(performance.now() - scoringStarted),
      trees_ms: evidence.requests.timingsMs?.treeDiscovery ?? null,
      manifests_ms: evidence.requests.timingsMs?.manifestFetch ?? null,
      rest_requests: evidence.requests.rest,
      graphql_requests: evidence.requests.graphql,
      cache_source: evidenceHit?.state === "fresh" ? "l1" : "miss",
      repository_discovery: evidence.requests.repositoryDiscovery ?? "fetched",
      timed_out: false,
    });
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

  private emit(input: V2EnrichmentInput, event: string, fields: Record<string, string | number | boolean | null> = {}): void {
    if (!input.telemetry) return;
    emitV2Telemetry({ event, correlation_id: input.telemetry.correlationId, subject_id: input.telemetry.subjectId, ...fields });
  }
}
