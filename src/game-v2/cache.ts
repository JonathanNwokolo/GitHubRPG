import { BALANCE_VERSION, CACHE_NAMESPACE, CATALOG_VERSION, DETECTOR_VERSION, ENGINE_VERSION, SCHEMA_VERSION } from "./constants";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "./types";

export interface EvidenceCacheIdentity { username: string; sourceFingerprint: string; referenceDate: string }

/** Character freshness is hourly; millisecond fetch timestamps must not prevent cross-instance L2 reuse. */
export function createCacheReferenceBucket(referenceDate: string): string {
  const timestamp = new Date(referenceDate);
  if (!Number.isFinite(timestamp.getTime())) throw new Error("cache_reference_date_invalid");
  timestamp.setUTCMinutes(0, 0, 0);
  return timestamp.toISOString();
}

/** V2 never shares the V1 cache namespace or schema. */
export function createEvidenceCacheKey(identity: EvidenceCacheIdentity): string {
  return [CACHE_NAMESPACE, ENGINE_VERSION, SCHEMA_VERSION, DETECTOR_VERSION, CATALOG_VERSION, BALANCE_VERSION, identity.username.trim().toLowerCase(), identity.sourceFingerprint, identity.referenceDate].map(encodeURIComponent).join("/");
}

export function createCharacterCacheKey(identity: EvidenceCacheIdentity): string {
  return ["character", createEvidenceCacheKey(identity)].join("/");
}

/** Final-character alias used by polling before the GitHub base profile is loaded. */
export function createLatestCharacterCacheKey(username: string): string {
  return ["character-latest", CACHE_NAMESPACE, ENGINE_VERSION, SCHEMA_VERSION, DETECTOR_VERSION, CATALOG_VERSION, BALANCE_VERSION, username.trim().toLowerCase()]
    .map(encodeURIComponent)
    .join("/");
}

export function isCompatibleCachedCharacter(value: unknown, username?: string): value is RPGCharacterV2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RPGCharacterV2>;
  const cachedUsername = candidate.identity?.username;
  return candidate.engineVersion === ENGINE_VERSION
    && candidate.schemaVersion === SCHEMA_VERSION
    && candidate.detectorVersion === DETECTOR_VERSION
    && candidate.catalogVersion === CATALOG_VERSION
    && candidate.balanceVersion === BALANCE_VERSION
    && candidate.meta?.cacheNamespace === CACHE_NAMESPACE
    && typeof cachedUsername === "string"
    && (username === undefined || cachedUsername.trim().toLowerCase() === username.trim().toLowerCase())
    && typeof candidate.explanation === "object"
    && candidate.explanation !== null
    && ["full", "partial", "unavailable"].includes(candidate.explanation.subclass?.coverage ?? "")
    && Array.isArray(candidate.achievements)
    && Array.isArray(candidate.titles)
    && typeof candidate.grimoire === "object"
    && candidate.grimoire !== null;
}

export interface CacheWritePolicy {
  ttlMs: number;
  staleTtlMs?: number;
}

export interface CacheLookup<V> {
  value: V;
  state: "fresh" | "stale";
  createdAt: number;
  expiresAt: number;
  staleUntil: number;
  source?: "l1" | "l2";
}

export interface EvidenceCacheAdapter<V> {
  get(key: string): Promise<CacheLookup<V> | null>;
  set(key: string, value: V, policy: CacheWritePolicy): Promise<void>;
  delete(key: string): Promise<void>;
}

interface HydratableEvidenceCacheAdapter<V> extends EvidenceCacheAdapter<V> {
  hydrate(key: string, lookup: CacheLookup<V>): Promise<void>;
}

interface StoredEntry<V> extends CacheLookup<V> {
  value: V;
}

/** Bounded process-local cache. It is deliberately an L1 adapter, never described as persistent. */
export class InMemoryEvidenceCache<V> implements EvidenceCacheAdapter<V> {
  private readonly entries = new Map<string, StoredEntry<V>>();

  constructor(
    private readonly maxEntries: number = 250,
    private readonly now: () => number = Date.now
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error("cache_max_entries_must_be_positive");
  }

  async get(key: string): Promise<CacheLookup<V> | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    const timestamp = this.now();
    if (entry.staleUntil <= timestamp) {
      this.entries.delete(key);
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return { ...entry, state: entry.expiresAt <= timestamp ? "stale" : "fresh" };
  }

  async set(key: string, value: V, policy: CacheWritePolicy): Promise<void> {
    if (!Number.isFinite(policy.ttlMs) || policy.ttlMs <= 0) throw new Error("cache_ttl_must_be_positive");
    const createdAt = this.now();
    const expiresAt = createdAt + policy.ttlMs;
    const staleUntil = expiresAt + Math.max(0, policy.staleTtlMs ?? 0);
    this.entries.delete(key);
    this.entries.set(key, { value, state: "fresh", createdAt, expiresAt, staleUntil });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async hydrate(key: string, lookup: CacheLookup<V>): Promise<void> {
    if (lookup.staleUntil <= this.now()) return;
    this.entries.delete(key);
    this.entries.set(key, { ...lookup, value: lookup.value });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

export interface MultiLayerCacheEvent {
  operation: "get" | "set" | "delete";
  layer: "l1" | "l2";
  error?: unknown;
}

/** L1 is an optimization: every read can recover from the shared L2 alone. */
export class MultiLayerEvidenceCache<V> implements EvidenceCacheAdapter<V> {
  constructor(
    private readonly l1: EvidenceCacheAdapter<V>,
    private readonly l2: EvidenceCacheAdapter<V>,
    private readonly onEvent?: (event: MultiLayerCacheEvent) => void
  ) {}

  async get(key: string): Promise<CacheLookup<V> | null> {
    try {
      const local = await this.l1.get(key);
      if (local) {
        this.onEvent?.({ operation: "get", layer: "l1" });
        return { ...local, source: "l1" };
      }
    } catch (error) {
      this.onEvent?.({ operation: "get", layer: "l1", error });
    }

    let shared: CacheLookup<V> | null = null;
    try {
      shared = await this.l2.get(key);
      this.onEvent?.({ operation: "get", layer: "l2" });
    } catch (error) {
      this.onEvent?.({ operation: "get", layer: "l2", error });
      return null;
    }
    if (!shared) return null;

    try {
      const hydratable = this.l1 as Partial<HydratableEvidenceCacheAdapter<V>>;
      if (hydratable.hydrate) await hydratable.hydrate(key, shared);
      else {
        const now = Date.now();
        await this.l1.set(key, shared.value, {
          ttlMs: Math.max(1, shared.expiresAt - now),
          staleTtlMs: Math.max(0, shared.staleUntil - Math.max(now, shared.expiresAt)),
        });
      }
    } catch (error) {
      this.onEvent?.({ operation: "set", layer: "l1", error });
    }
    return { ...shared, source: "l2" };
  }

  async set(key: string, value: V, policy: CacheWritePolicy): Promise<void> {
    await Promise.all([
      this.l1.set(key, value, policy).catch((error) => this.onEvent?.({ operation: "set", layer: "l1", error })),
      this.l2.set(key, value, policy).catch((error) => this.onEvent?.({ operation: "set", layer: "l2", error })),
    ]);
  }

  async delete(key: string): Promise<void> {
    await Promise.all([
      this.l1.delete(key).catch((error) => this.onEvent?.({ operation: "delete", layer: "l1", error })),
      this.l2.delete(key).catch((error) => this.onEvent?.({ operation: "delete", layer: "l2", error })),
    ]);
  }
}

export interface SyncCacheStore<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): unknown;
}

/** Small synchronous TTL/LRU store for collector tree and manifest reuse. */
export class InMemoryTtlStore<K, V> implements SyncCacheStore<K, V> {
  private readonly entries = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now
  ) {}

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): this {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    return this;
  }

  get size(): number {
    return this.entries.size;
  }
}

export type V2EvidenceCache = EvidenceCacheAdapter<TechnologyEvidenceProfile>;
export type V2CharacterCache = EvidenceCacheAdapter<RPGCharacterV2>;
