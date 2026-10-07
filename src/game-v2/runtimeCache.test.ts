// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { CachePayloadTooLargeError, VercelRuntimeEvidenceCache, type RuntimeCacheStore } from "./runtimeCache";

function store(): RuntimeCacheStore & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>();
  return {
    values,
    get: vi.fn(async (key) => values.get(key) ?? null),
    set: vi.fn(async (key, value) => { values.set(key, value); }),
    delete: vi.fn(async (key) => { values.delete(key); }),
  };
}

describe("Vercel Runtime Cache adapter", () => {
  it("preserves fresh, stale and expired states through serialization", async () => {
    let now = 0;
    const backend = store();
    const cache = new VercelRuntimeEvidenceCache({ kind: "test", isValue: (value): value is { ok: boolean } => Boolean(value && typeof value === "object" && "ok" in value), store: backend, now: () => now });
    await cache.set("key", { ok: true }, { ttlMs: 10, staleTtlMs: 10 });
    expect((await cache.get("key"))?.state).toBe("fresh");
    now = 11;
    expect((await cache.get("key"))?.state).toBe("stale");
    now = 21;
    expect(await cache.get("key")).toBeNull();
  });

  it("deletes corrupted payloads and treats them as misses", async () => {
    const backend = store();
    backend.values.set("bad", { character: "not-an-envelope" });
    const cache = new VercelRuntimeEvidenceCache({ kind: "test", isValue: (value): value is string => typeof value === "string", store: backend });
    expect(await cache.get("bad")).toBeNull();
    expect(backend.values.has("bad")).toBe(false);
  });

  it("rejects payloads above the configured item limit", async () => {
    const cache = new VercelRuntimeEvidenceCache({ kind: "test", isValue: (value): value is string => typeof value === "string", store: store(), maxItemBytes: 100 });
    await expect(cache.set("large", "x".repeat(200), { ttlMs: 1000 })).rejects.toBeInstanceOf(CachePayloadTooLargeError);
  });
});
