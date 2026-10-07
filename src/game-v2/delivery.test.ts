import { describe, expect, it, vi } from "vitest";
import { makeAverageProfile } from "@/test/builders";
import { InMemoryEvidenceCache, MultiLayerEvidenceCache, createCacheReferenceBucket, createEvidenceCacheKey, createManifestCacheKey, V2DeliveryService, V2EnrichmentAbortedError, normalizeRepositoryEvidence } from ".";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "./types";

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
    await expect(second.lookup(input)).resolves.toMatchObject({ cache: "hit", source: "l2", state: "ready" });
    expect(firstCollector).toHaveBeenCalledTimes(1);
    expect(secondCollector).not.toHaveBeenCalled();
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
