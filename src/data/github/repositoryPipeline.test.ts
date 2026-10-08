// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRPGCharacter } from "@/game/engine";
import { normalizeDeveloperProfile } from "../normalize";
import { validateRawGitHubData } from "../schemas";
import { GitHubApiDataSource, type GitHubApiDataSourceOptions } from "./GitHubApiDataSource";
import { GitHubRateLimitError, GitHubTimeoutError, GitHubUnavailableError } from "./errors";
import {
  GRAPHQL_CURSOR_PAGE_SIZE,
  GRAPHQL_PIPELINE_MIN_REPOS,
  GRAPHQL_REPO_PAGE_CONCURRENCY,
  GRAPHQL_REPOS_PER_PAGE,
  MAX_CONCURRENT_REQUESTS,
  MAX_GRAPHQL_REPO_PAGES,
} from "./limits";
import { GitHubProjectProtection } from "./protection";
import { ProjectBudgetDeniedError } from "./errors";
import { summarizeGraphqlCost } from "./stats";
import { createFakeGitHub, type FakeGitHubOptions, type FakeRepo } from "./testing/fakeGitHub";

const NOW = new Date("2026-10-05T12:00:00Z");
const TOKEN = "ghp_test_token";

function setup(fake: FakeGitHubOptions = {}, options: Partial<GitHubApiDataSourceOptions> = {}) {
  const github = createFakeGitHub(fake);
  const source = new GitHubApiDataSource({ token: TOKEN, fetch: github.fetch, now: () => NOW, sleep: async () => {}, ...options });
  return { github, source };
}

const names = (count: number) => Array.from({ length: count }, (_, i) => `repo-${i}`);
/** Varied enough to expose any reordering, loss or double count: forks, stars, several languages. */
const variedRepos = (count: number): FakeRepo[] =>
  names(count).map((name, i) => ({
    name,
    fork: i % 7 === 0,
    stars: (i * 13) % 97,
    forks: i % 5,
    languages: { [["TypeScript", "Go", "Rust", "Python"][i % 4]]: 1_000 + i, ...(i % 3 === 0 ? { CSS: 50 + i } : {}) },
  }));
const afters = (calls: Array<{ graphqlVariables?: Record<string, unknown> }>) => calls.map((c) => c.graphqlVariables?.after);
const expectedPageCursors = (pages: number) => Array.from({ length: pages }, (_, i) => (i === 0 ? null : `c${i * GRAPHQL_REPOS_PER_PAGE}`));

/** A fake whose repository requests take a while and are counted while in flight. */
function slowRepositoryPages(github: ReturnType<typeof createFakeGitHub>, delayMs = 8) {
  const gauge = { active: 0, maxActive: 0 };
  github.overrides.push(async (call) => {
    if (!call.graphqlQuery?.includes("repositories(") || call.graphqlQuery.includes("edges { cursor }")) return undefined;
    gauge.active++;
    gauge.maxActive = Math.max(gauge.maxActive, gauge.active);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    gauge.active--;
    return undefined;
  });
  return gauge;
}

describe("large profiles: repository pages without waiting for the previous page", () => {
  it("returns exactly what the sequential chain returns (same repositories, order, languages, coverage)", async () => {
    const repos = variedRepos(600);
    const pipelined = setup({ repos, publicRepos: 600 });
    // public_repos <= GRAPHQL_PIPELINE_MIN_REPOS keeps the plain sequential chain: the reference implementation.
    const sequential = setup({ repos, publicRepos: GRAPHQL_PIPELINE_MIN_REPOS });

    const a = await pipelined.source.getProfile("octo-dev");
    const b = await sequential.source.getProfile("octo-dev");

    expect(pipelined.github.cursorWalkCalls().length).toBeGreaterThan(0);
    expect(sequential.github.cursorWalkCalls()).toHaveLength(0);
    expect(a).toEqual(b);
    expect(a.repositories.coverage).toBe("full");
    expect(a.repositories.items.map((r) => r.name)).toEqual(names(600));
    // And through the whole pipeline, down to the character.
    const characterOf = (raw: typeof a) => createRPGCharacter(normalizeDeveloperProfile(validateRawGitHubData(raw)));
    expect(characterOf(a)).toEqual(characterOf(b));
  });

  it("requests the same full pages (same boundaries, same query variables) plus a cursor-only walk", async () => {
    const { source, github } = setup({ repos: variedRepos(600), publicRepos: 600 });
    await source.getProfile("octo-dev");

    expect(afters(github.repositoryPageCalls()).sort()).toEqual(expectedPageCursors(12).sort());
    expect(github.repositoryPageCalls().every((c) => c.graphqlVariables?.first === GRAPHQL_REPOS_PER_PAGE)).toBe(true);
    // 600 repositories at 100 per walk call = 6 calls, each continuing from the previous endCursor.
    expect(afters(github.cursorWalkCalls())).toEqual([null, "c100", "c200", "c300", "c400", "c500"]);
    expect(github.cursorWalkCalls().every((c) => c.graphqlVariables?.first === GRAPHQL_CURSOR_PAGE_SIZE)).toBe(true);
    // 1 REST user + 12 pages + 6 walk calls + 1 contributions (account created in 2019 => 8 years => 2 batches).
    expect(github.count("rest")).toBe(1);
    expect(github.count("graphql")).toBe(12 + 6 + 2);
    expect(github.languageCalls()).toHaveLength(0);
  });

  it("never has more than GRAPHQL_REPO_PAGE_CONCURRENCY pages in flight, nor more than the client allows overall", async () => {
    const { source, github } = setup({ repos: variedRepos(1000), publicRepos: 1000, createdAt: "2009-01-01T00:00:00Z" });
    const gauge = slowRepositoryPages(github);
    await source.getProfile("octo-dev");

    expect(gauge.maxActive).toBeGreaterThan(1); // they really overlap
    expect(gauge.maxActive).toBeLessThanOrEqual(GRAPHQL_REPO_PAGE_CONCURRENCY);
    expect(github.state.maxInFlight).toBeLessThanOrEqual(MAX_CONCURRENT_REQUESTS);
  });

  it("asks for the next cursor-walk call before the pages the previous call unlocked", async () => {
    const { source, github } = setup({ repos: variedRepos(300), publicRepos: 300 });
    await source.getProfile("octo-dev");
    const order = github.calls.filter((c) => c.path === "/graphql" && c.graphqlQuery?.includes("repositories("));
    const indexOf = (after: string | null, walk: boolean) =>
      order.findIndex((c) => c.graphqlVariables?.after === after && Boolean(c.graphqlQuery?.includes("edges { cursor }")) === walk);
    // Walk call #1 (after null) unlocks page "c50" and page "c100"; walk call #2 ("c100") must not queue behind them.
    expect(indexOf("c100", true)).toBeLessThan(indexOf("c50", false));
    // The first page needs no cursor and is requested immediately, before the walk answers.
    expect(indexOf(null, false)).toBeLessThan(indexOf("c100", true));
  });

  it("uses the plain sequential chain, with no cursor walk, up to GRAPHQL_PIPELINE_MIN_REPOS repositories", async () => {
    for (const count of [0, 5, GRAPHQL_REPOS_PER_PAGE, GRAPHQL_PIPELINE_MIN_REPOS]) {
      const { source, github } = setup({ repos: variedRepos(count), publicRepos: count });
      await source.getProfile("octo-dev");
      expect(github.cursorWalkCalls()).toHaveLength(0);
      expect(github.repositoryPageCalls()).toHaveLength(Math.max(1, Math.ceil(count / GRAPHQL_REPOS_PER_PAGE)));
    }
    const large = setup({ repos: variedRepos(GRAPHQL_PIPELINE_MIN_REPOS + 1), publicRepos: GRAPHQL_PIPELINE_MIN_REPOS + 1 });
    await large.source.getProfile("octo-dev");
    expect(large.github.cursorWalkCalls().length).toBeGreaterThan(0);
  });

  it("a list that ends exactly on a page boundary asks for no extra page", async () => {
    const { source, github } = setup({ repos: variedRepos(200), publicRepos: 200 });
    const raw = await source.getProfile("octo-dev");
    expect(afters(github.repositoryPageCalls()).sort()).toEqual(expectedPageCursors(4).sort());
    expect(raw.repositories.items).toHaveLength(200);
    expect(raw.repositories.coverage).toBe("full");
  });

  it("keeps the page limit: 1000 repositories are full, 1010 are partial, and neither asks for a 21st page", async () => {
    const exact = setup({ repos: variedRepos(GRAPHQL_REPOS_PER_PAGE * MAX_GRAPHQL_REPO_PAGES), publicRepos: 1000 });
    const rawExact = await exact.source.getProfile("octo-dev");
    expect(exact.github.repositoryPageCalls()).toHaveLength(MAX_GRAPHQL_REPO_PAGES);
    expect(rawExact.repositories.items).toHaveLength(1000);
    expect(rawExact.repositories.coverage).toBe("full");

    const over = setup({ repos: variedRepos(1010), publicRepos: 1010 });
    const rawOver = await over.source.getProfile("octo-dev");
    expect(over.github.repositoryPageCalls()).toHaveLength(MAX_GRAPHQL_REPO_PAGES);
    // The walk stops as soon as the last allowed page has a cursor: 10 calls of 100, not 11.
    expect(over.github.cursorWalkCalls()).toHaveLength(10);
    expect(rawOver.repositories.items).toHaveLength(1000);
    expect(rawOver.repositories.coverage).toBe("partial");
    expect(normalizeDeveloperProfile(validateRawGitHubData(rawOver)).languagesCoverage).toBe("partial");
  });

  it("counts a repository once even if a push shifts a page boundary", async () => {
    const repos = variedRepos(300);
    const { source, github } = setup({ repos, publicRepos: 300 });
    github.overrides.push((call) => {
      if (call.graphqlQuery?.includes("edges { cursor }") || call.graphqlVariables?.after !== "c100") return undefined;
      const nodes = [repos[99], ...repos.slice(100, 150)].map((r) => ({
        name: r.name, isFork: false, stargazerCount: 1, forkCount: 0,
        languages: { totalCount: 1, edges: [{ size: 100, node: { name: "Go" } }] },
      }));
      return new Response(JSON.stringify({ data: { user: { repositories: { pageInfo: { hasNextPage: true, endCursor: "c150" }, nodes } } } }));
    });
    const raw = await source.getProfile("octo-dev");
    expect(new Set(raw.repositories.items.map((r) => r.name)).size).toBe(raw.repositories.items.length);
    expect(raw.repositories.items).toHaveLength(300);
  });

  it("reports partial when the list turns out longer than the walk saw (never claims full)", async () => {
    const { source, github } = setup({ repos: variedRepos(200), publicRepos: 200 });
    github.overrides.push((call) => {
      if (call.graphqlQuery?.includes("edges { cursor }") || call.graphqlVariables?.after !== "c150") return undefined;
      return new Response(JSON.stringify({ data: { user: { repositories: { pageInfo: { hasNextPage: true, endCursor: "c200" }, nodes: [] } } } }));
    });
    const raw = await source.getProfile("octo-dev");
    expect(raw.repositories.coverage).toBe("partial");
  });

  it("falls back to REST /languages for the same repositories as the sequential chain", async () => {
    const repos = variedRepos(300).map((r, i) => (i % 40 === 0 && !r.fork ? { ...r, languagesNull: true } : r));
    const pipelined = setup({ repos, publicRepos: 300 });
    const sequential = setup({ repos, publicRepos: GRAPHQL_PIPELINE_MIN_REPOS });
    const a = await pipelined.source.getProfile("octo-dev");
    const b = await sequential.source.getProfile("octo-dev");
    expect(pipelined.github.languageCalls().map((c) => c.path)).toEqual(sequential.github.languageCalls().map((c) => c.path));
    expect(pipelined.github.languageCalls().length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });
});

describe("large profiles: failures stay failures", () => {
  const big = { repos: variedRepos(600), publicRepos: 600 };

  it("a rate limit in the middle of the batch rejects with the rate-limit error and stops asking GitHub", async () => {
    const { source, github } = setup(big);
    github.overrides.push((call) =>
      !call.graphqlQuery?.includes("edges { cursor }") && call.graphqlVariables?.after === "c150"
        ? new Response(JSON.stringify({ message: "You have exceeded a secondary rate limit" }), { status: 403, headers: { "retry-after": "30" } })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubRateLimitError);
    // 12 pages + 6 walk calls would have been needed: the gate refuses everything after the first 403.
    expect(github.repositoryPageCalls().length + github.cursorWalkCalls().length).toBeLessThan(12 + 6);
  });

  it("a rate limit opens the project circuit once and the next cold profile is refused before any request", async () => {
    const protection = new GitHubProjectProtection({ store: null, now: () => NOW.getTime() });
    const { source, github } = setup(big, { projectProtection: protection });
    github.overrides.push((call) =>
      call.graphqlVariables?.after === "c100" && !call.graphqlQuery?.includes("edges { cursor }")
        ? new Response("{}", { status: 429, headers: { "retry-after": "45" } })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubRateLimitError);
    const callsAfterFailure = github.calls.length;
    await expect(source.getProfile("someone-else")).rejects.toBeInstanceOf(ProjectBudgetDeniedError);
    expect(github.calls.length).toBe(callsAfterFailure);
  });

  it("one failing page fails the whole profile: no partial list is ever returned", async () => {
    const { source, github } = setup(big);
    github.overrides.push((call) =>
      !call.graphqlQuery?.includes("edges { cursor }") && call.graphqlVariables?.after === "c250"
        ? new Response("{}", { status: 500 })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubUnavailableError);
  });

  it("a failing cursor-walk call fails the whole profile", async () => {
    const { source, github } = setup(big);
    github.overrides.push((call) =>
      call.graphqlQuery?.includes("edges { cursor }") && call.graphqlVariables?.after === "c200"
        ? new Response("{}", { status: 500 })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubUnavailableError);
  });

  it("retries a transient 503 on one page and still returns the complete list", async () => {
    const { source, github } = setup(big);
    let failedOnce = false;
    github.overrides.push((call) => {
      if (failedOnce || call.graphqlQuery?.includes("edges { cursor }") || call.graphqlVariables?.after !== "c300") return undefined;
      failedOnce = true;
      return new Response("{}", { status: 503 });
    });
    const raw = await source.getProfile("octo-dev");
    expect(failedOnce).toBe(true);
    expect(raw.repositories.items).toHaveLength(600);
    expect(raw.repositories.coverage).toBe("full");
    expect(github.repositoryPageCalls()).toHaveLength(12 + 1); // the retried page is requested twice
  });

  it("a request that never answers times out (abort) and the siblings are cancelled", async () => {
    const github = createFakeGitHub(big);
    const source = new GitHubApiDataSource({
      token: TOKEN,
      now: () => NOW,
      sleep: async () => {},
      timeoutMs: 40,
      fetch: (input, init) => {
        const body = typeof init?.body === "string" ? (JSON.parse(init.body) as { variables?: Record<string, unknown>; query: string }) : null;
        if (body?.variables?.after === "c250" && !body.query.includes("edges { cursor }")) {
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          });
        }
        return github.fetch(input, init);
      },
    });
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubTimeoutError);
    const issued = github.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(github.calls.length).toBe(issued); // nothing keeps running after the failure
  });
});

describe("telemetry of the GraphQL cost", () => {
  it("counts requests by purpose and exposes only numbers", async () => {
    const { source } = setup({ repos: variedRepos(600), publicRepos: 600 });
    await source.getProfile("octo-dev");
    const report = source.getReports().at(-1);
    expect(report?.graphqlByPurpose).toMatchObject({
      repositories: { requests: 12 },
      repository_cursors: { requests: 6 },
      contributions: { requests: 2 },
      other: { requests: 0 },
    });
    expect(report?.graphqlRequests).toBe(20);
    const summary = summarizeGraphqlCost(report);
    expect(summary).toMatchObject({
      graphql_repository_requests: 12,
      graphql_cursor_requests: 6,
      graphql_contribution_requests: 2,
      graphql_other_requests: 0,
    });
    expect(Object.values(summary).every((value) => typeof value === "number")).toBe(true);
    expect(JSON.stringify(summary)).not.toContain(TOKEN);
    expect(report?.phases).toMatchObject({ userMs: expect.any(Number), repositoriesMs: expect.any(Number), contributionsMs: expect.any(Number) });
  });

  it("is empty for a report without a cold fetch", () => {
    expect(summarizeGraphqlCost(undefined)).toEqual({});
  });
});

describe("small profiles and the anonymous fallback are untouched", () => {
  it("a small authenticated profile costs exactly what it did: 1 REST + 1 repositories + 1 contributions", async () => {
    const { source, github } = setup({ repos: variedRepos(8), publicRepos: 8, createdAt: "2026-01-10T00:00:00Z" });
    await source.getProfile("octo-dev");
    expect(github.count("rest")).toBe(1);
    expect(github.count("graphql")).toBe(2);
    expect(github.cursorWalkCalls()).toHaveLength(0);
    expect(source.getReports().at(-1)?.graphqlByPurpose).toMatchObject({ repositories: { requests: 1 }, repository_cursors: { requests: 0 }, contributions: { requests: 1 } });
  });

  it("without a token a huge profile never uses GraphQL, and the 60/h anonymous quota does not open the circuit", async () => {
    const protection = new GitHubProjectProtection({ store: null, now: () => NOW.getTime() });
    const github = createFakeGitHub({
      repos: variedRepos(30),
      publicRepos: 1000,
      rateLimitHeaders: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "52", "x-ratelimit-reset": String(Math.floor(NOW.getTime() / 1000) + 3600) },
    });
    const source = new GitHubApiDataSource({ fetch: github.fetch, now: () => NOW, sleep: async () => {}, projectProtection: protection });
    await source.getProfile("octo-dev");
    expect(github.count("graphql")).toBe(0);
    expect(github.cursorWalkCalls()).toHaveLength(0);
    // A second cold fetch (fresh source, same project protection) is still admitted: 52 of 60 left is normal
    // anonymous traffic, not an exhausted budget (a fixed reserve of 100 would have opened the circuit here).
    const second = new GitHubApiDataSource({ fetch: github.fetch, now: () => NOW, sleep: async () => {}, projectProtection: protection });
    await expect(second.getProfile("octo-dev")).resolves.toBeDefined();
  });

  it('repositoryTransport "rest" still forces REST for a large profile', async () => {
    const { source, github } = setup({ repos: variedRepos(300), publicRepos: 300 }, { repositoryTransport: "rest" });
    await source.getProfile("octo-dev");
    expect(github.repositoryPageCalls()).toHaveLength(0);
    expect(github.cursorWalkCalls()).toHaveLength(0);
    expect(github.calls.some((c) => c.path.endsWith("/repos"))).toBe(true);
  });
});
