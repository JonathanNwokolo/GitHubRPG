import { describe, expect, it } from "vitest";
import { GitHubRateLimitError, ProjectBudgetDeniedError } from "./errors";
import { createGitHubRequestProtectionContext, GitHubProjectProtection, isInteractiveVisitor, shouldScheduleProfileEnrichment } from "./protection";

class MemoryStore {
  readonly values = new Map<string, unknown>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: unknown) { this.values.set(key, value); }
  async delete(key: string) { this.values.delete(key); }
}

function trustedContext(username = "hero") {
  return createGitHubRequestProtectionContext(new Headers({
    "x-vercel-id": "gru1::abc",
    "x-vercel-forwarded-for": "203.0.113.8",
  }), "experimental_v2_api", username, "11111111-1111-4111-8111-111111111111");
}

describe("GitHub project protection", () => {
  it("uses only a Vercel-authenticated address and never keeps raw IP data", () => {
    expect(trustedContext().clientKey).toMatch(/^[a-f0-9]{24}$/);
    expect(trustedContext().clientKey).not.toContain("203.0.113.8");
    expect(createGitHubRequestProtectionContext(new Headers({ "x-vercel-forwarded-for": "203.0.113.8" }), "profile_page", "hero").clientKey).toBeNull();
  });

  it("keeps SSR available to crawlers without letting them start enrichment", () => {
    expect(shouldScheduleProfileEnrichment(new Headers({ "user-agent": "Mozilla/5.0 Chrome/140" }))).toBe(true);
    expect(shouldScheduleProfileEnrichment(new Headers({ "user-agent": "Twitterbot/1.0" }))).toBe(false);
    expect(shouldScheduleProfileEnrichment(new Headers({ "user-agent": "Googlebot/2.1" }))).toBe(false);
    expect(shouldScheduleProfileEnrichment(new Headers())).toBe(false);
  });

  it("enrichment and the profile counter share one interactive-visitor rule", () => {
    for (const userAgent of ["Mozilla/5.0 Chrome/140", "Twitterbot/1.0", "Googlebot/2.1", "Slackbot-LinkExpanding", "curl/8.4", "Discordbot/2.0", "WhatsApp/2", ""]) {
      const headers = new Headers(userAgent ? { "user-agent": userAgent } : {});
      expect(isInteractiveVisitor(headers), userAgent).toBe(shouldScheduleProfileEnrichment(headers));
    }
    expect(isInteractiveVisitor(new Headers({ "user-agent": "Mozilla/5.0 Chrome/140" }))).toBe(true);
    expect(isInteractiveVisitor(new Headers({ "user-agent": "Googlebot/2.1" }))).toBe(false);
  });

  it("permits normal cold work and limits a burst of unique usernames with Retry-After", async () => {
    let now = 1_000;
    const protection = new GitHubProjectProtection({ store: null, now: () => now, maxUniqueColdUsernames: 2, maxColdWork: 10, clientWindowMs: 60_000 });
    const context = trustedContext();
    await protection.beforeColdWork("one", context);
    await protection.beforeColdWork("two", context);
    await expect(protection.beforeColdWork("three", context)).rejects.toMatchObject({ reason: "client_rate", retryAfterSeconds: 60 });
    now += 60_000;
    await expect(protection.beforeColdWork("three", context)).resolves.toBeUndefined();
  });

  it("opens, denies, half-opens one probe and recovers without a permanent state", async () => {
    let now = Date.parse("2026-10-08T12:00:00.000Z");
    const store = new MemoryStore();
    const protection = new GitHubProjectProtection({ store, now: () => now });
    await protection.observeRateLimit(new GitHubRateLimitError("secondary", new Date(now + 10_000), 42));
    await expect(protection.beforeColdWork("one")).rejects.toBeInstanceOf(ProjectBudgetDeniedError);
    now += 10_001;
    await expect(protection.beforeColdWork("probe")).resolves.toBeUndefined();
    await expect(protection.beforeColdWork("other")).rejects.toMatchObject({ retryAfterSeconds: 5 });
    await protection.observeSuccess();
    await expect(protection.beforeColdWork("other")).resolves.toBeUndefined();
    expect(store.values.size).toBe(0);
  });

  it("reserves enough known budget for more than the observed p90 cold cost", async () => {
    const now = Date.parse("2026-10-08T12:00:00.000Z");
    const protection = new GitHubProjectProtection({ store: new MemoryStore(), now: () => now, reserve: { rest: 40, graphql: 10 } });
    await protection.observeSnapshot("rest", { limit: 5_000, remaining: 31, resetAt: new Date(now + 60_000) });
    await expect(protection.beforeColdWork("cold-profile")).rejects.toMatchObject({ reason: "github_budget", retryAfterSeconds: 60 });
  });

  it("scales the reserve below the anonymous REST quota instead of blocking normal tokenless traffic", async () => {
    const protection = new GitHubProjectProtection({ store: null, reserve: { rest: 100, graphql: 100 }, now: () => Date.parse("2026-10-08T12:00:00.000Z") });
    await protection.observeSnapshot("rest", { limit: 60, remaining: 52, resetAt: new Date("2026-10-08T13:00:00.000Z") });
    await expect(protection.beforeColdWork("octocat")).resolves.toBeUndefined();
  });

  it("recovers a provisional budget circuit when a higher authoritative snapshot arrives", async () => {
    const now = Date.parse("2026-10-08T12:00:00.000Z");
    const protection = new GitHubProjectProtection({ store: new MemoryStore(), now: () => now, reserve: { rest: 40, graphql: 10 } });
    await protection.observeSnapshot("rest", { limit: 5_000, remaining: 31, resetAt: new Date(now + 60_000) });
    await protection.observeSnapshot("rest", { limit: 5_000, remaining: 4_900, resetAt: new Date(now + 60_000) });
    await expect(protection.beforeColdWork("allowed-again")).resolves.toBeUndefined();
  });
});
