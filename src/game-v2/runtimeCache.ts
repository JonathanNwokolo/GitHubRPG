import { getCache } from "@vercel/functions";
import { SCHEMA_VERSION } from "./constants";
import type { CacheLookup, CacheWritePolicy, EvidenceCacheAdapter } from "./cache";

export const VERCEL_RUNTIME_CACHE_ITEM_LIMIT_BYTES = 2 * 1024 * 1024;
const ENVELOPE_VERSION = 1;

export interface RuntimeCacheStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, options?: { name?: string; tags?: string[]; ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface RuntimeCacheEnvelope<V> {
  envelopeVersion: number;
  schemaVersion: string;
  kind: string;
  createdAt: number;
  expiresAt: number;
  staleUntil: number;
  value: V;
}

export class CachePayloadTooLargeError extends Error {
  constructor(public readonly bytes: number, public readonly limitBytes: number) {
    super(`runtime_cache_payload_too_large:${bytes}:${limitBytes}`);
    this.name = "CachePayloadTooLargeError";
  }
}

function isEnvelope(value: unknown): value is RuntimeCacheEnvelope<unknown> {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<RuntimeCacheEnvelope<unknown>>;
  return entry.envelopeVersion === ENVELOPE_VERSION
    && entry.schemaVersion === SCHEMA_VERSION
    && typeof entry.kind === "string"
    && typeof entry.createdAt === "number"
    && typeof entry.expiresAt === "number"
    && typeof entry.staleUntil === "number"
    && "value" in entry;
}

export interface VercelRuntimeEvidenceCacheOptions<V> {
  kind: string;
  isValue: (value: unknown) => value is V;
  store?: RuntimeCacheStore;
  now?: () => number;
  maxItemBytes?: number;
}

/** Shared/persistent L2 adapter. Engine and collector never import Vercel APIs. */
export class VercelRuntimeEvidenceCache<V> implements EvidenceCacheAdapter<V> {
  private readonly store: RuntimeCacheStore;
  private readonly now: () => number;
  private readonly maxItemBytes: number;

  constructor(private readonly options: VercelRuntimeEvidenceCacheOptions<V>) {
    this.store = options.store ?? getCache({ namespace: "github-rpg-v2-delivery" });
    this.now = options.now ?? Date.now;
    this.maxItemBytes = options.maxItemBytes ?? VERCEL_RUNTIME_CACHE_ITEM_LIMIT_BYTES;
  }

  async get(key: string): Promise<CacheLookup<V> | null> {
    const raw = await this.store.get(key);
    if (raw === null) return null;
    if (!isEnvelope(raw) || raw.kind !== this.options.kind || !this.options.isValue(raw.value)) {
      await this.store.delete(key).catch(() => undefined);
      return null;
    }
    const timestamp = this.now();
    if (raw.staleUntil <= timestamp) {
      await this.store.delete(key).catch(() => undefined);
      return null;
    }
    return {
      value: raw.value,
      state: raw.expiresAt <= timestamp ? "stale" : "fresh",
      createdAt: raw.createdAt,
      expiresAt: raw.expiresAt,
      staleUntil: raw.staleUntil,
    };
  }

  async set(key: string, value: V, policy: CacheWritePolicy): Promise<void> {
    if (!Number.isFinite(policy.ttlMs) || policy.ttlMs <= 0) throw new Error("cache_ttl_must_be_positive");
    const createdAt = this.now();
    const envelope: RuntimeCacheEnvelope<V> = {
      envelopeVersion: ENVELOPE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      kind: this.options.kind,
      createdAt,
      expiresAt: createdAt + policy.ttlMs,
      staleUntil: createdAt + policy.ttlMs + Math.max(0, policy.staleTtlMs ?? 0),
      value,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(envelope)).byteLength;
    if (bytes > this.maxItemBytes) throw new CachePayloadTooLargeError(bytes, this.maxItemBytes);
    await this.store.set(key, envelope, {
      ttl: Math.max(1, Math.ceil((envelope.staleUntil - createdAt) / 1000)),
      tags: ["github-rpg-v2", this.options.kind, SCHEMA_VERSION],
      name: `github-rpg-v2-${this.options.kind}`,
    });
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }
}
