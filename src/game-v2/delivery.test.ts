import { describe, expect, it, vi } from "vitest";
import { makeAverageProfile, m } from "@/test/builders";
import { InMemoryEvidenceCache, MultiLayerEvidenceCache, createCacheReferenceBucket, createCharacterCacheKey, createEvidenceCacheKey, createLatestCharacterCacheKey, createManifestCacheKey, V2DeliveryService, V2EnrichmentAbortedError, normalizeRepositoryEvidence } from ".";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "./types";
import { GitHubProjectProtection } from "@/data/github/protection";
import { GitHubRateLimitError, ProjectBudgetDeniedError } from "@/data/github/errors";

function evidence(coverage: "full" | "partial" | "unavailable" = "full"): TechnologyEvidenceProfile {
  return normalizeRepositoryEvidence({
    repositories: [],
    coverage: { coverage, eligible: 0, examined: 0, failed: coverage === "unavailable" ? 1 : 0, omittedByBudget: 0 },
    requests: { rest: 0, graphql: 0, manifestFetches: 0, reposInspected: 0, cacheHits: 0 },
  });
}

const profile = makeAverageProfile({ username: "CacheHero", referenceDate: "2026-10-07T12:00:00.000Z" });
const input = { profile, sourceFingerprint: "repos-sha-1" };

describe("V2 delivery cache", () => {
  it("supports miss, hit, expiry and stale lookup", async () => {
    let now = 0;
    const cache = new InMemoryEvidenceCache<string>(2, () => now);
    expect(await cache.get("x")).toBeNull();
    await cache.set("x", "value", { ttlMs: 10, staleTtlMs: 10 });
    expect((await cache.get("x"))?.state).toBe("fresh");
    now = 11;
    expect((await cache.get("x"))?.state).toBe("stale");
    now = 21;
    expect(await cache.get("x")).toBeNull();
  });

  it("includes every semantic version and source freshness identity in the key", () => {
    const first = createEvidenceCacheKey({ username: "Hero", sourceFingerprint: "sha-a", referenceDate: "2026-10-07" });
    const second = createEvidenceCacheKey({ username: "hero", sourceFingerprint: "sha-b", referenceDate: "2026-10-07" });
    expect(first).not.toBe(second);
    expect(first).toContain("2.0-experimental-v24-evo");
  });

  it("buckets equivalent reference dates hourly for cross-instance reuse", () => {
    expect(createCacheReferenceBucket("2026-10-07T12:01:00.000Z")).toBe("2026-10-07T12:00:00.000Z");
    expect(createCacheReferenceBucket("2026-10-07T12:59:59.999Z")).toBe("2026-10-07T12:00:00.000Z");
    expect(createCacheReferenceBucket("2026-10-07T13:00:00.000Z")).toBe("2026-10-07T13:00:00.000Z");
  });

  it("invalidates manifest content when the blob SHA changes", () => {
    expect(createManifestCacheKey("repo", "package.json", "sha-a")).not.toBe(createManifestCacheKey("repo", "package.json", "sha-b"));
  });

  it("coalesces concurrent enrichments and caches only the successful result", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const collector = vi.fn(async () => { await gate; return evidence(); });
    const service = new V2DeliveryService({ collector });
    const first = service.enrich(input);
    const second = service.enrich(input);
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(collector).toHaveBeenCalledTimes(1);
    expect([a.cache, b.cache].sort()).toEqual(["coalesced", "miss"]);
    expect((await service.enrich(input)).cache).toBe("hit");
  });

  it("does not cache unavailable enrichment as success", async () => {
    const collector = vi.fn(async () => evidence("unavailable"));
    const service = new V2DeliveryService({ collector });
    await expect(service.enrich(input)).resolves.toMatchObject({ state: "unavailable", cache: "miss" });
    await service.enrich(input);
    expect(collector).toHaveBeenCalledTimes(2);
  });

  it("propagates failures and permits a retry", async () => {
    const collector = vi.fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(evidence());
    const service = new V2DeliveryService({ collector });
    await expect(service.enrich(input)).rejects.toThrow("timeout");
    await expect(service.enrich(input)).resolves.toMatchObject({ cache: "miss", state: "ready" });
    expect(collector).toHaveBeenCalledTimes(2);
  });

  it("reuses shared L2 from a separate instance without collecting again", async () => {
    const sharedEvidence = new InMemoryEvidenceCache<TechnologyEvidenceProfile>();
    const sharedCharacters = new InMemoryEvidenceCache<RPGCharacterV2>();
    const firstCollector = vi.fn(async () => evidence());
    const secondCollector = vi.fn(async () => evidence());
    const first = new V2DeliveryService({
      collector: firstCollector,
      evidenceCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache(), sharedEvidence),
      characterCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache(), sharedCharacters),
    });
    const second = new V2DeliveryService({
      collector: secondCollector,
      evidenceCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache(), sharedEvidence),
      characterCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache(), sharedCharacters),
    });

    await first.enrich(input);
    await expect(second.lookupByUsername("CacheHero")).resolves.toMatchObject({ cache: "hit", source: "l2", state: "ready" });
    await expect(second.lookup(input)).resolves.toMatchObject({ cache: "hit", source: "l2", state: "ready" });
    expect(firstCollector).toHaveBeenCalledTimes(1);
    expect(secondCollector).not.toHaveBeenCalled();
  });

  it.each(["full", "partial"] as const)("serves a valid final %s character by username without collecting", async (coverage) => {
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>();
    const seedCollector = vi.fn(async () => evidence(coverage));
    const seed = new V2DeliveryService({ characterCache, collector: seedCollector });
    await seed.enrich(input);
    const collector = vi.fn(async () => evidence());
    const service = new V2DeliveryService({ characterCache, collector });

    await expect(service.lookupByUsername("cachehero")).resolves.toMatchObject({ state: coverage === "partial" ? "partial" : "ready", cache: "hit", character: { identity: { username: "CacheHero" } } });
    expect(seedCollector).toHaveBeenCalledTimes(1);
    expect(collector).not.toHaveBeenCalled();
  });

  it("reports incomplete V1 calculations as partial and does not replace a complete latest alias", async () => {
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>();
    const service = new V2DeliveryService({ characterCache, collector: async () => evidence() });
    await service.enrich(input);

    const partialInput = {
      profile: makeAverageProfile({ username: "CacheHero", referenceDate: profile.referenceDate, commits: m(0, "unavailable") }),
      sourceFingerprint: "repos-sha-partial",
    };
    await expect(service.enrich(partialInput)).resolves.toMatchObject({ state: "partial", character: { calculationCoverage: { status: "partial" } } });
    await expect(service.lookupByUsername("CacheHero")).resolves.toMatchObject({ state: "ready", character: { calculationCoverage: { status: "complete" } } });
    await expect(service.lookup(partialInput)).resolves.toMatchObject({ state: "partial", character: { calculationCoverage: { status: "partial" } } });
    await expect(service.lookupByUsername("CacheHero")).resolves.toMatchObject({ state: "ready", character: { calculationCoverage: { status: "complete" } } });
  });

  it("rejects incompatible or cross-user latest aliases", async () => {
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>();
    const valid = (await new V2DeliveryService({ collector: async () => evidence() }).enrich(input)).character!;
    await characterCache.set(createLatestCharacterCacheKey("CacheHero"), { ...valid, schemaVersion: "wrong-schema" } as unknown as RPGCharacterV2, { ttlMs: 1_000 });
    const service = new V2DeliveryService({ characterCache, collector: vi.fn(async () => evidence()) });
    await expect(service.lookupByUsername("CacheHero")).resolves.toBeNull();

    await characterCache.set(createLatestCharacterCacheKey("CacheHero"), { ...valid, identity: { ...valid.identity, username: "OtherHero" } }, { ttlMs: 1_000 });
    await expect(service.lookupByUsername("CacheHero")).resolves.toBeNull();
  });

  it("backfills the fast alias from a fresh pre-migration exact cache entry without extending its TTL", async () => {
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>();
    const character = (await new V2DeliveryService({ collector: async () => evidence() }).enrich(input)).character!;
    const exactKey = createCharacterCacheKey({ username: profile.username, sourceFingerprint: input.sourceFingerprint, referenceDate: createCacheReferenceBucket(profile.referenceDate) });
    await characterCache.set(exactKey, character, { ttlMs: 30_000, staleTtlMs: 60_000 });
    const service = new V2DeliveryService({ characterCache, collector: vi.fn(async () => evidence()) });

    await expect(service.lookup(input)).resolves.toMatchObject({ cache: "hit", state: "ready" });
    const alias = await characterCache.get(createLatestCharacterCacheKey(profile.username));
    expect(alias).toMatchObject({ state: "fresh", value: { identity: { username: "CacheHero" } } });
    expect((alias?.expiresAt ?? 0) - Date.now()).toBeLessThanOrEqual(30_000);
  });

  it("preserves the existing stale-while-revalidate state on username fast lookup", async () => {
    let now = 0;
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>(250, () => now);
    const service = new V2DeliveryService({ characterCache, collector: async () => evidence(), policy: { characterTtlMs: 10, characterStaleTtlMs: 100 } });
    await service.enrich(input);
    now = 11;
    await expect(service.lookupByUsername("CacheHero")).resolves.toMatchObject({ state: "stale", cache: "stale", character: expect.any(Object) });
  });

  it("documents that simultaneous misses on two instances can duplicate enrichment", async () => {
    const sharedCharacters = new InMemoryEvidenceCache<RPGCharacterV2>();
    const collectorA = vi.fn(async () => evidence());
    const collectorB = vi.fn(async () => evidence());
    const make = (collector: typeof collectorA) => new V2DeliveryService({
      collector,
      characterCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache<RPGCharacterV2>(), sharedCharacters),
    });
    await Promise.all([make(collectorA).enrich(input), make(collectorB).enrich(input)]);
    expect(collectorA).toHaveBeenCalledTimes(1);
    expect(collectorB).toHaveBeenCalledTimes(1);
  });

  it("serves stale immediately and registers only one background refresh for ten requests", async () => {
    let now = 0;
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>(250, () => now);
    const seed = new V2DeliveryService({ characterCache, collector: async () => evidence() });
    await seed.enrich(input);
    now = 60 * 60 * 1000 + 1;

    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const collector = vi.fn(async () => { await gate; return evidence(); });
    const service = new V2DeliveryService({ characterCache, collector });
    const scheduled: Promise<void>[] = [];
    const results = await Promise.all(Array.from({ length: 10 }, () => service.deliver(input, (task) => scheduled.push(task))));

    expect(results.every((result) => result.state === "stale" && result.character !== null)).toBe(true);
    expect(scheduled).toHaveLength(1);
    release();
    await Promise.all(scheduled);
    expect(collector).toHaveBeenCalledTimes(1);
  });

  it("keeps a stale character available when background revalidation fails", async () => {
    let now = 0;
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>(250, () => now);
    const seed = new V2DeliveryService({
      characterCache,
      collector: async () => evidence(),
      policy: { characterTtlMs: 10, characterStaleTtlMs: 100 },
    });
    await seed.enrich(input);
    now = 11;
    const service = new V2DeliveryService({ characterCache, collector: async () => { throw new Error("upstream 502"); } });
    const scheduled: Promise<void>[] = [];
    await expect(service.deliver(input, (task) => scheduled.push(task))).resolves.toMatchObject({ state: "stale", character: expect.any(Object) });
    await Promise.all(scheduled);
    await expect(service.lookup(input)).resolves.toMatchObject({ state: "stale", character: expect.any(Object) });
  });

  it("serves stale during an open project circuit and denies only a cold miss", async () => {
    let now = 0;
    const protection = new GitHubProjectProtection({ store: null, now: () => now });
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>(250, () => now);
    const seed = new V2DeliveryService({ characterCache, collector: async () => evidence(), projectProtection: protection, policy: { characterTtlMs: 10, characterStaleTtlMs: 100 } });
    await seed.enrich(input);
    now = 11;
    await protection.observeRateLimit(new GitHubRateLimitError("secondary", new Date(now + 60_000), 10));
    const service = new V2DeliveryService({ characterCache, collector: async () => evidence(), projectProtection: protection });
    const scheduled: Promise<void>[] = [];
    await expect(service.deliver(input, (task) => scheduled.push(task))).resolves.toMatchObject({ state: "stale", enrichmentStarted: false });
    expect(scheduled).toHaveLength(0);
    await expect(service.deliver({ ...input, sourceFingerprint: "cold-other" }, () => undefined)).rejects.toBeInstanceOf(ProjectBudgetDeniedError);
  });

  it("bounds the enrichment queue instead of extending function duration indefinitely", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const protection = new GitHubProjectProtection({ store: null });
    const service = new V2DeliveryService({ collector: async () => { await gate; return evidence(); }, projectProtection: protection, maxConcurrentEnrichments: 1, maxQueuedEnrichments: 0 });
    const first = service.enrich(input);
    await Promise.resolve();
    await expect(service.enrich({ ...input, sourceFingerprint: "other" })).rejects.toMatchObject({ reason: "enrichment_concurrency" });
    release();
    await first;
  });

  it("coalesces a ten-request cold stampede into one collector", async () => {
    const collector = vi.fn(async () => evidence());
    const service = new V2DeliveryService({ collector });
    await Promise.all(Array.from({ length: 10 }, () => service.enrich(input)));
    expect(collector).toHaveBeenCalledTimes(1);
  });

  it("treats L2 read failure as a safe miss", async () => {
    const broken = {
      get: vi.fn(async () => { throw new Error("l2 unavailable"); }),
      set: vi.fn(async () => { throw new Error("l2 unavailable"); }),
      delete: vi.fn(async () => { throw new Error("l2 unavailable"); }),
    };
    const collector = vi.fn(async () => evidence());
    const service = new V2DeliveryService({
      collector,
      evidenceCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache(), broken),
      characterCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache(), broken),
    });
    await expect(service.enrich(input)).resolves.toMatchObject({ state: "ready" });
    expect(collector).toHaveBeenCalledTimes(1);
  });

  it("aborts at the hard budget and never writes an incomplete result", async () => {
    vi.useFakeTimers();
    const collector = vi.fn((_username: string, options: { signal?: AbortSignal }) => new Promise<TechnologyEvidenceProfile>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>();
    const service = new V2DeliveryService({ collector, characterCache, budget: { softMs: 10, hardMs: 20 } });
    const pending = service.enrich(input);
    const rejection = expect(pending).rejects.toBeInstanceOf(V2EnrichmentAbortedError);
    await vi.advanceTimersByTimeAsync(21);
    await rejection;
    expect(characterCache.size).toBe(0);
    vi.useRealTimers();
  });
});
