// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createFakeUpstash, FAKE_USAGE_CONFIG } from "./testing/fakeUpstash";
import {
  INVOKED_PROFILES_KEY,
  invokedProfileId,
  readInvokedProfileCount,
  recordInvokedProfile,
} from "./invokedProfiles";

/** Every caller gets its own memo, as separate serverless instances would: only Redis is shared. */
function instance(redis: ReturnType<typeof createFakeUpstash>) {
  const deps = { config: FAKE_USAGE_CONFIG, fetch: redis.fetch, knownIds: new Set<string>() };
  return {
    record: (username: string) => recordInvokedProfile(username, deps),
    count: () => readInvokedProfileCount(deps),
  };
}

describe("unique profiles summoned (Redis Set)", () => {
  it("counts a first summon, ignores a repeat, and treats casing as the same profile", async () => {
    const redis = createFakeUpstash();
    const app = instance(redis);

    expect(await app.record("Torvalds")).toBe(true);
    expect(await app.count()).toBe(1);
    expect(await app.record("Torvalds")).toBe(false);
    expect(await app.record("torvalds")).toBe(false);
    expect(await app.record("  TORVALDS ")).toBe(false);
    expect(await app.count()).toBe(1);

    expect(await app.record("gvanrossum")).toBe(true);
    expect(await app.count()).toBe(2);
  });

  it("keeps uniqueness across instances through Redis, even without any local memo", async () => {
    const redis = createFakeUpstash();
    const a = instance(redis);
    const b = instance(redis);

    expect(await a.record("octocat")).toBe(true);
    expect(await b.record("OctoCat")).toBe(false); // SADD returned 0
    expect(await b.record("hubot")).toBe(true);
    expect(await a.count()).toBe(2);
    expect(redis.members.size).toBe(2);
  });

  it("stores only an opaque id: no username, no TTL, no extra commands", async () => {
    const redis = createFakeUpstash();
    await instance(redis).record("Torvalds");

    expect(redis.commands).toEqual([["SADD", INVOKED_PROFILES_KEY, invokedProfileId("torvalds")]]);
    expect(INVOKED_PROFILES_KEY).toBe("ghrpg:v1:invoked-profiles");
    const stored = [...redis.members];
    expect(stored).toEqual([invokedProfileId("torvalds")]);
    expect(stored[0]).toMatch(/^[a-f0-9]{32}$/);
    expect(JSON.stringify(redis.commands).toLowerCase()).not.toContain("torvalds");
    expect(redis.commands.flat().some((part) => /^(EXPIRE|PEXPIRE|SETEX|TTL)$/i.test(part))).toBe(false);
  });

  it("derives the id from the lowercase username only", () => {
    expect(invokedProfileId("Torvalds")).toBe(invokedProfileId("torvalds"));
    expect(invokedProfileId("torvalds")).not.toBe(invokedProfileId("torvalds2"));
  });

  it("skips the Redis round trip for a profile this instance already stored", async () => {
    const redis = createFakeUpstash();
    const app = instance(redis);
    await app.record("octocat");
    await app.record("octocat");
    expect(redis.commands).toHaveLength(1);
  });

  it("never throws and never remembers a failed write, whatever Redis does", async () => {
    for (const failure of ["http_500", "error_body", "network", "hang"] as const) {
      const redis = createFakeUpstash();
      redis.state.failure = failure;
      const deps = { config: FAKE_USAGE_CONFIG, fetch: redis.fetch, timeoutMs: 20, knownIds: new Set<string>() };

      expect(await recordInvokedProfile("octocat", deps), failure).toBe(false);
      expect(await readInvokedProfileCount(deps), failure).toBeNull();

      redis.state.failure = "none"; // Redis recovers: the profile must still be countable.
      expect(await recordInvokedProfile("octocat", deps), failure).toBe(true);
    }
  });

  it("does nothing when the counter is disabled or unconfigured", async () => {
    const redis = createFakeUpstash();
    const deps = { config: { enabled: false }, fetch: redis.fetch, knownIds: new Set<string>() };

    expect(await recordInvokedProfile("octocat", deps)).toBe(false);
    expect(await readInvokedProfileCount(deps)).toBeNull();
    expect(redis.commands).toEqual([]);
  });

  it("reads nothing but a sane integer", async () => {
    const text = (async () => Response.json({ result: "12" })) as unknown as typeof fetch;
    expect(await readInvokedProfileCount({ config: FAKE_USAGE_CONFIG, fetch: text })).toBeNull();
    const negative = (async () => Response.json({ result: -1 })) as unknown as typeof fetch;
    expect(await readInvokedProfileCount({ config: FAKE_USAGE_CONFIG, fetch: negative })).toBeNull();
  });

  it("authenticates with the configured credential and sends no visitor data", async () => {
    const seen: RequestInit[] = [];
    const spy = (async (_url: string | URL | Request, init?: RequestInit) => {
      seen.push(init ?? {});
      return Response.json({ result: 1 });
    }) as typeof fetch;
    await recordInvokedProfile("octocat", { config: FAKE_USAGE_CONFIG, fetch: spy, knownIds: new Set() });

    expect(seen[0].headers).toEqual({ Authorization: `Bearer ${FAKE_USAGE_CONFIG.restToken}`, "Content-Type": "application/json" });
    expect(seen[0].method).toBe("POST");
  });
});
