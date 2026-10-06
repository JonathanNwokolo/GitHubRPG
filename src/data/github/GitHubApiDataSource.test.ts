// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "../contracts";
import { createRPGCharacter } from "@/game/engine";
import { normalizeDeveloperProfile } from "../normalize";
import { validateRawGitHubData } from "../schemas";
import { GitHubApiDataSource, type GitHubApiDataSourceOptions } from "./GitHubApiDataSource";
import {
  GitHubDataValidationError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubUnavailableError,
  InvalidUsernameError,
} from "./errors";
import { createFakeGitHub, type FakeGitHubOptions } from "./testing/fakeGitHub";

const NOW = new Date("2026-10-05T12:00:00Z");
const TOKEN = "ghp_test_token";

/**
 * This file exercises the REST repository path (one /languages call per repository), which is what
 * anonymous requests use. The default authenticated path (batched GraphQL) is tested in
 * graphqlRepositories.test.ts.
 */
function setup(fake: FakeGitHubOptions = {}, options: Partial<GitHubApiDataSourceOptions> = {}) {
  const github = createFakeGitHub(fake);
  const source = new GitHubApiDataSource({
    token: TOKEN,
    fetch: github.fetch,
    now: () => NOW,
    sleep: async () => {},
    repositoryTransport: "rest",
    ...options,
  });
  return { github, source };
}

const SMALL: FakeGitHubOptions = {
  login: "Octo-Dev",
  createdAt: "2025-08-20T10:00:00Z",
  followers: 7,
  repos: [
    { name: "alpha", stars: 10, forks: 2, languages: { TypeScript: 8000, CSS: 2000 } },
    { name: "beta", stars: 0, forks: 0, languages: { TypeScript: 2000 } },
    { name: "big-fork", fork: true, stars: 999, forks: 99, languages: { Rust: 900_000 } },
    { name: "empty", size: 0 },
  ],
  days: { "2025-08-21": 3, "2025-09-01": 2, "2025-09-02": 1, "2026-10-04": 5, "2026-10-05": 1 },
  years: {
    2025: { commits: 4, pullRequests: 1, issues: 2, reviews: 3 },
    2026: { commits: 5, pullRequests: 1, issues: 0, reviews: 0 },
  },
};

describe("a typical profile", () => {
  it("maps REST + GraphQL data into RawGitHubData that passes validation", async () => {
    const { source } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");

    expect(() => validateRawGitHubData(raw)).not.toThrow();
    expect(raw).toMatchObject({
      username: "Octo-Dev",
      displayName: "Octo Dev",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      isDemo: false,
      createdAt: "2025-08-20T10:00:00.000Z",
      fetchedAt: NOW.toISOString(),
      followers: { value: 7, coverage: "full" },
      commits: { value: 9, coverage: "full" },
      pullRequests: { value: 2, coverage: "full" },
      issues: { value: 2, coverage: "full" },
      reviews: { value: 3, coverage: "full" },
      repositories: { coverage: "full" },
      languagesCoverage: "full",
    });
    expect(raw.repositories.items.map((r) => r.name)).toEqual(["alpha", "beta", "big-fork", "empty"]);
  });

  it("derives activity from the contribution calendar, ignoring days padded into the neighbouring year", async () => {
    const { source } = setup(SMALL);
    const { activity } = await source.getProfile("octo-dev");

    expect(activity.activeDays).toEqual({ value: 5, coverage: "full" });
    expect(activity.longestStreakDays).toEqual({ value: 2, coverage: "full" }); // Sep 1-2 and Oct 4-5 tie at 2
    expect(activity.currentStreakDays).toEqual({ value: 2, coverage: "full" });
    // Only Oct 4-5 2026 fall inside the last 365 days.
    expect(activity.recentActiveDays).toEqual({ value: 2, coverage: "full" });
    // Aug 2025 .. Oct 2026 inclusive = 15 months
    expect(activity.monthlyContributions.months).toHaveLength(15);
    expect(activity.monthlyContributions.months[0]).toBe(3);
    expect(activity.monthlyContributions.months[1]).toBe(3);
    expect(activity.monthlyContributions.months[14]).toBe(6);
    expect(activity.monthlyContributions.coverage).toBe("full");
  });

  it("excludes forks from stars, forks and languages through the normal pipeline", async () => {
    const { source } = setup(SMALL);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));

    expect(profile.ownRepositories.value).toBe(3);
    expect(profile.starsReceived.value).toBe(10);
    expect(profile.forksReceived.value).toBe(2);
    expect(profile.starredRepositories.value).toBe(1);
    expect(profile.languages.map((l) => l.name).sort()).toEqual(["CSS", "TypeScript"]);
    expect(profile.languages.find((l) => l.name === "TypeScript")).toMatchObject({ bytes: 10_000, repoCount: 2 });
  });

  it("never requests languages for forks, and does not trust size 0 to skip a repository (REST size lags a fresh push)", async () => {
    const { source, github } = setup(SMALL);
    await source.getProfile("octo-dev");
    expect(github.languageCalls().map((c) => c.path).sort()).toEqual([
      "/repos/Octo-Dev/alpha/languages",
      "/repos/Octo-Dev/beta/languages",
      "/repos/Octo-Dev/empty/languages",
    ]);
  });

  it("builds a character with the real engine (no engine change needed)", async () => {
    const { source } = setup(SMALL);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));
    const character = createRPGCharacter(profile);
    expect(character.identity.username).toBe("Octo-Dev");
    expect(character.meta.isDemo).toBe(false);
    expect(character.progression.level).toBeGreaterThanOrEqual(1);
  });
});

describe("request cost", () => {
  it("uses 1 user + 1 repo page + one languages call per eligible repo + 1 GraphQL for a young account", async () => {
    const { source, github } = setup(SMALL);
    await source.getProfile("octo-dev");
    expect(github.count("rest")).toBe(1 + 1 + 3);
    expect(github.count("graphql")).toBe(1);

    const [report] = source.getReports();
    expect(report).toMatchObject({ cache: "miss", restRequests: 5, graphqlRequests: 1, totalRequests: 6, authenticated: true, ok: true });
  });

  it("batches a 15-year account into 3 GraphQL requests (5 + 5 + 5 years)", async () => {
    const years: Record<number, { commits: number }> = {};
    for (let y = 2012; y <= 2026; y++) years[y] = { commits: 10 };
    const { source, github } = setup({ createdAt: "2012-01-15T00:00:00Z", years, repos: [] });
    const raw = await source.getProfile("octo-dev");

    expect(github.count("graphql")).toBe(3);
    expect(raw.commits).toEqual({ value: 150, coverage: "full" });
    expect(raw.activity.monthlyContributions.months).toHaveLength(14 * 12 + 10);
  });

  it("counts every year once: sparse data and years with no activity", async () => {
    const { source, github } = setup({
      createdAt: "2023-01-01T00:00:00Z",
      years: { 2023: { commits: 5 }, 2026: { commits: 8 } },
    });
    const raw = await source.getProfile("octo-dev");
    expect(raw.commits).toEqual({ value: 13, coverage: "full" });
    expect(github.count("graphql")).toBe(1);
  });

  it("limits language concurrency", async () => {
    const repos = Array.from({ length: 40 }, (_, i) => ({ name: `repo-${i}`, languages: { Go: 100 } }));
    const { source, github } = setup({ repos });
    await source.getProfile("octo-dev");
    expect(github.count("rest")).toBe(2 + 40);
    expect(github.state.maxInFlight).toBeLessThanOrEqual(6);
  });
});

describe("pagination", () => {
  it("walks every repository page", async () => {
    const repos = Array.from({ length: 250 }, (_, i) => ({ name: `repo-${i}`, stars: 1, size: 0 }));
    const { source, github } = setup({ repos, pageSize: 100 });
    const raw = await source.getProfile("octo-dev");

    expect(raw.repositories.items).toHaveLength(250);
    expect(raw.repositories.coverage).toBe("full");
    const pages = github.calls.filter((c) => c.path.endsWith("/repos")).map((c) => c.query.get("page"));
    expect(pages).toEqual(["1", "2", "3"]);
    expect(github.calls.find((c) => c.path.endsWith("/repos"))?.query.get("per_page")).toBe("100");
  });

  it("marks repositories partial when the page safety limit is hit", async () => {
    const repos = Array.from({ length: 1_100 }, (_, i) => ({ name: `repo-${i}`, size: 0 }));
    const { source, github } = setup({ repos, pageSize: 100 });
    const raw = await source.getProfile("octo-dev");

    expect(raw.repositories.items).toHaveLength(1_000);
    expect(raw.repositories.coverage).toBe("partial");
    expect(github.calls.filter((c) => c.path.endsWith("/repos"))).toHaveLength(10);
  });

  it("marks repositories partial when GitHub reports more public repos than were listed", async () => {
    const { source } = setup({ repos: [{ name: "a" }], publicRepos: 3 });
    expect((await source.getProfile("octo-dev")).repositories.coverage).toBe("partial");
  });
});

describe("coverage", () => {
  it("keeps stars exact but languages partial when the language cap is exceeded", async () => {
    const repos = Array.from({ length: 160 }, (_, i) => ({ name: `repo-${i}`, stars: 1, languages: { Go: 100 } }));
    const { source, github } = setup({ repos });
    const raw = await source.getProfile("octo-dev");

    expect(github.languageCalls()).toHaveLength(150);
    expect(raw.repositories.coverage).toBe("full");
    expect(raw.languagesCoverage).toBe("partial");

    const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
    expect(profile.starsReceived).toEqual({ value: 160, coverage: "full" });
    expect(profile.languagesCoverage).toBe("partial");
  });

  it("marks languages partial when one repository's languages are unavailable (451)", async () => {
    const { source } = setup({
      repos: [
        { name: "ok", languages: { Go: 10 } },
        { name: "blocked", languagesStatus: 451 },
      ],
    });
    const raw = await source.getProfile("octo-dev");
    expect(raw.languagesCoverage).toBe("partial");
    expect(raw.repositories.coverage).toBe("full");
  });

  it("partial repositories drag languages down to partial in the normalized profile", async () => {
    const { source } = setup({ repos: [{ name: "a", languages: { Go: 10 } }], publicRepos: 5 });
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));
    expect(profile.ownRepositories.coverage).toBe("partial");
    expect(profile.languagesCoverage).toBe("partial");
  });

  it("without a token: REST data is real, every contribution metric is unavailable and no GraphQL is attempted", async () => {
    const { source, github } = setup(SMALL, { token: undefined });
    const raw = await source.getProfile("octo-dev");

    expect(github.count("graphql")).toBe(0);
    expect(raw.followers.coverage).toBe("full");
    expect(raw.repositories.coverage).toBe("full");
    for (const metric of [raw.commits, raw.pullRequests, raw.issues, raw.reviews, ...Object.values(raw.activity).slice(0, 4)]) {
      expect(metric).toEqual({ value: null, coverage: "unavailable" });
    }
    expect(raw.activity.monthlyContributions).toEqual({ months: [], coverage: "unavailable" });

    expect(() => createRPGCharacter(normalizeDeveloperProfile(validateRawGitHubData(raw)))).not.toThrow();
    expect(github.calls.every((c) => c.headers.authorization === undefined)).toBe(true);
  });

  it("an account with no contributions at all is full zeros, not unavailable", async () => {
    const { source } = setup({ repos: [] });
    const raw = await source.getProfile("octo-dev");
    expect(raw.commits).toEqual({ value: 0, coverage: "full" });
    expect(raw.activity.activeDays).toEqual({ value: 0, coverage: "full" });
  });
});

describe("errors", () => {
  it("rejects invalid usernames before any request", async () => {
    const { source, github } = setup(SMALL);
    await expect(source.getProfile("../etc/passwd")).rejects.toBeInstanceOf(InvalidUsernameError);
    await expect(source.getProfile("")).rejects.toBeInstanceOf(InvalidUsernameError);
    expect(github.calls).toHaveLength(0);
  });

  it("404 -> ProfileNotFoundError, and the miss is remembered briefly", async () => {
    const { source, github } = setup({ missingUser: true });
    await expect(source.getProfile("ghost")).rejects.toBeInstanceOf(ProfileNotFoundError);
    await expect(source.getProfile("Ghost")).rejects.toBeInstanceOf(ProfileNotFoundError);
    expect(github.calls).toHaveLength(1);
    expect(source.getReports().map((r) => r.cache)).toEqual(["miss", "not-found-hit"]);
  });

  it("organizations are not adventurers", async () => {
    const { source } = setup({ type: "Organization" });
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(ProfileNotFoundError);
  });

  it("rate limit -> GitHubRateLimitError with resetAt, nothing cached", async () => {
    const reset = Math.floor(NOW.getTime() / 1000) + 120;
    const { source, github } = setup(SMALL);
    github.overrides.push(
      () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) } })
    );
    const error = await source.getProfile("octo-dev").catch((e) => e);
    expect(error).toBeInstanceOf(GitHubRateLimitError);
    expect(error.resetAt).toEqual(new Date(reset * 1000));
  });

  it("timeout -> GitHubTimeoutError", async () => {
    // A fetch that only ends when the AbortController fires.
    const hanging: typeof fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const source = new GitHubApiDataSource({ token: TOKEN, fetch: hanging, now: () => NOW, timeoutMs: 15, sleep: async () => {} });
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubTimeoutError);
  });

  it("malformed REST payload -> GitHubDataValidationError", async () => {
    const { source, github } = setup(SMALL);
    github.overrides.push((call) => (call.path === "/users/octo-dev" ? new Response(JSON.stringify({ login: 5 }), { status: 200 }) : undefined));
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubDataValidationError);
  });

  it("malformed GraphQL payload -> GitHubDataValidationError", async () => {
    const { source, github } = setup(SMALL);
    github.overrides.push((call) =>
      call.path === "/graphql" ? new Response(JSON.stringify({ data: { user: { y2026: { totalCommitContributions: "many" } } } }), { status: 200 }) : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubDataValidationError);
  });

  it("GitHub 500 -> GitHubUnavailableError", async () => {
    const { source, github } = setup(SMALL);
    github.overrides.push(() => new Response("{}", { status: 500 }));
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubUnavailableError);
  });

  it("a failure aborts the sibling requests instead of leaving them running", async () => {
    const repos = Array.from({ length: 60 }, (_, i) => ({ name: `repo-${i}`, languages: { Go: 1 } }));
    const { source, github } = setup({ repos });
    // GraphQL fails right away; the 60 language calls must not all be sent.
    github.overrides.push((call) => (call.path === "/graphql" ? new Response("{}", { status: 500 }) : undefined));
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubUnavailableError);
    expect(github.languageCalls().length).toBeLessThan(60);
  });

  it("does not cache failures", async () => {
    const { source, github } = setup(SMALL);
    let fail = true;
    github.overrides.push(() => (fail ? new Response("{}", { status: 500 }) : undefined));
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubUnavailableError);
    fail = false;
    await expect(source.getProfile("octo-dev")).resolves.toBeTruthy();
  });
});

describe("cache and deduplication", () => {
  it("serves the second call from cache, case-insensitively, without touching GitHub", async () => {
    const { source, github } = setup(SMALL);
    const first = await source.getProfile("Octo-Dev");
    const callsAfterFirst = github.calls.length;
    const second = await source.getProfile("octo-dev");
    const third = await source.getProfile("OCTO-DEV");

    expect(github.calls.length).toBe(callsAfterFirst);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(source.getReports().map((r) => r.cache)).toEqual(["miss", "hit", "hit"]);
    expect(source.getReports()[1]).toMatchObject({ totalRequests: 0 });
  });

  it("refetches after the TTL", async () => {
    let now = NOW.getTime();
    const { source, github } = setup(SMALL, { now: () => new Date(now), cacheTtlMs: 60_000 });
    await source.getProfile("octo-dev");
    const calls = github.calls.length;
    now += 59_000;
    await source.getProfile("octo-dev");
    expect(github.calls.length).toBe(calls);
    now += 2_000;
    const refreshed = await source.getProfile("octo-dev");
    expect(github.calls.length).toBe(calls * 2);
    expect(refreshed.fetchedAt).toBe(new Date(now).toISOString());
  });

  it("collapses simultaneous requests for the same user into one external fetch", async () => {
    const { source, github } = setup(SMALL);
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => source.getProfile(i % 2 ? "octo-dev" : "OCTO-DEV")));

    expect(new Set(results).size).toBe(1);
    expect(github.count("rest")).toBe(5);
    expect(github.count("graphql")).toBe(1);
    const outcomes = source.getReports().map((r) => r.cache);
    expect(outcomes.filter((c) => c === "miss")).toHaveLength(1);
    expect(outcomes.filter((c) => c === "coalesced")).toHaveLength(19);
  });

  it("shares a failure with every waiting caller and then allows a retry", async () => {
    const { source, github } = setup(SMALL);
    let fail = true;
    github.overrides.push(() => (fail ? new Response("{}", { status: 500 }) : undefined));
    const settled = await Promise.allSettled([source.getProfile("octo-dev"), source.getProfile("octo-dev"), source.getProfile("octo-dev")]);
    expect(settled.every((s) => s.status === "rejected")).toBe(true);
    fail = false;
    await expect(source.getProfile("octo-dev")).resolves.toBeTruthy();
  });

  it("different users do not share cache entries", async () => {
    const { source } = setup(SMALL);
    await source.getProfile("octo-dev");
    const missing = createFakeGitHub({ missingUser: true });
    const other = new GitHubApiDataSource({ token: TOKEN, fetch: missing.fetch, now: () => NOW });
    await expect(other.getProfile("octo-dev")).rejects.toBeInstanceOf(ProfileNotFoundError);
  });

  it("reports through onReport", async () => {
    const onReport = vi.fn();
    const { source } = setup(SMALL, { onReport });
    await source.getProfile("octo-dev");
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(onReport.mock.calls[0][0]).toMatchObject({ username: "octo-dev", cache: "miss", ok: true });
  });
});

describe("yearly history (kept from the requests that already feed the totals)", () => {
  it("keeps commits, PRs, reviews, issues, contributions and active days per calendar year", async () => {
    const { source } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");

    expect(raw.activity.yearly).toEqual({
      coverage: "full",
      years: [
        { year: 2025, contributions: 6, commits: 4, pullRequests: 1, reviews: 3, issues: 2, activeDays: 3 },
        { year: 2026, contributions: 6, commits: 5, pullRequests: 1, reviews: 0, issues: 0, activeDays: 2 },
      ],
    });
  });

  it("adds no request: the same calls as before feed the totals and the yearly breakdown", async () => {
    const { source, github } = setup(SMALL);
    await source.getProfile("octo-dev");
    expect(github.count("rest")).toBe(1 + 1 + 3);
    expect(github.count("graphql")).toBe(1);
  });

  it("agrees exactly with the lifetime totals and the monthly series", async () => {
    const { source } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");
    const years = raw.activity.yearly?.years ?? [];

    expect(years.reduce((sum, y) => sum + y.commits, 0)).toBe(raw.commits.value);
    expect(years.reduce((sum, y) => sum + y.pullRequests, 0)).toBe(raw.pullRequests.value);
    expect(years.reduce((sum, y) => sum + y.reviews, 0)).toBe(raw.reviews.value);
    expect(years.reduce((sum, y) => sum + y.issues, 0)).toBe(raw.issues.value);
    expect(years.reduce((sum, y) => sum + y.activeDays, 0)).toBe(raw.activity.activeDays.value);
    expect(years.reduce((sum, y) => sum + y.contributions, 0)).toBe(
      raw.activity.monthlyContributions.months.reduce((sum, n) => sum + n, 0)
    );
  });

  it("records an empty year as a real zero, never as a gap", async () => {
    const { source } = setup({
      createdAt: "2023-01-01T00:00:00Z",
      years: { 2023: { commits: 5 }, 2026: { commits: 8 } },
      days: { "2023-02-01": 5, "2026-03-01": 8 },
    });
    const raw = await source.getProfile("octo-dev");
    expect(raw.activity.yearly?.years.map((y) => [y.year, y.contributions, y.commits])).toEqual([
      [2023, 5, 5],
      [2024, 0, 0],
      [2025, 0, 0],
      [2026, 8, 8],
    ]);
  });

  it("keeps where the longest streak happened (earliest run on a tie), consistent with its length", async () => {
    const { source } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");
    expect(raw.activity.longestStreakPeriod).toEqual({ start: "2025-09-01", end: "2025-09-02" });
    expect(raw.activity.longestStreakDays.value).toBe(2);
  });

  it("survives validation and normalization into the profile", async () => {
    const { source } = setup(SMALL);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));
    expect(profile.activity.yearly?.coverage).toBe("full");
    expect(profile.activity.yearly?.years).toHaveLength(2);
    expect(profile.activity.longestStreakPeriod).toEqual({ start: "2025-09-01", end: "2025-09-02" });
  });

  it("without a token the yearly history is unavailable (no years, no period), never zeros", async () => {
    const { source } = setup(SMALL, { token: undefined });
    const raw = await source.getProfile("octo-dev");
    expect(raw.activity.yearly).toEqual({ years: [], coverage: "unavailable" });
    expect(raw.activity.longestStreakPeriod).toBeNull();
    const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
    expect(profile.activity.yearly).toEqual({ years: [], coverage: "unavailable" });
  });
});
