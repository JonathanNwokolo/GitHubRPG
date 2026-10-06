// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizeDeveloperProfile } from "../normalize";
import { validateRawGitHubData } from "../schemas";
import { createRPGCharacter } from "@/game/engine";
import { GitHubApiDataSource, type GitHubApiDataSourceOptions } from "./GitHubApiDataSource";
import { GitHubRateLimitError } from "./errors";
import { GRAPHQL_LANGUAGES_PER_REPO, GRAPHQL_REPOS_PER_PAGE, MAX_GRAPHQL_REPO_PAGES } from "./limits";
import { REPOSITORIES_QUERY } from "./graphqlRepositories";
import { createFakeGitHub, type FakeGitHubOptions, type FakeRepo } from "./testing/fakeGitHub";

const NOW = new Date("2026-10-05T12:00:00Z");
const TOKEN = "ghp_test_token";

function setup(fake: FakeGitHubOptions = {}, options: Partial<GitHubApiDataSourceOptions> = {}) {
  const github = createFakeGitHub(fake);
  const source = new GitHubApiDataSource({ token: TOKEN, fetch: github.fetch, now: () => NOW, sleep: async () => {}, ...options });
  return { github, source };
}

const SMALL: FakeGitHubOptions = {
  login: "Octo-Dev",
  createdAt: "2025-08-20T10:00:00Z",
  repos: [
    { name: "alpha", stars: 10, forks: 2, languages: { TypeScript: 8000, CSS: 2000 } },
    { name: "beta", stars: 0, forks: 0, languages: { TypeScript: 2000 } },
    { name: "big-fork", fork: true, stars: 999, forks: 99, languages: { Rust: 900_000 } },
    { name: "empty", size: 0 },
    { name: "docs-only" },
  ],
  days: { "2026-10-05": 1 },
  years: { 2026: { commits: 5 } },
};

const manyRepos = (count: number, extra: Partial<FakeRepo> = {}): FakeRepo[] =>
  Array.from({ length: count }, (_, i) => ({ name: `repo-${i}`, stars: 1, languages: { Go: 100 }, ...extra }));

const repositoriesResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const isRepositoriesQuery = (query: string | undefined) => query?.includes("repositories(") ?? false;

describe("GraphQL repositories + languages (default when authenticated)", () => {
  it("reads repositories and languages without a single REST /languages or /repos call", async () => {
    const { source, github } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");

    expect(github.languageCalls()).toHaveLength(0);
    expect(github.calls.filter((c) => c.path.endsWith("/repos"))).toHaveLength(0);
    // 1 REST (user) + 1 GraphQL (repositories) + 1 GraphQL (contributions)
    expect(github.count("rest")).toBe(1);
    expect(github.count("graphql")).toBe(2);
    expect(raw.repositories.items.map((r) => r.name)).toEqual(["alpha", "beta", "big-fork", "empty", "docs-only"]);
    expect(raw.repositories.coverage).toBe("full");
    expect(raw.languagesCoverage).toBe("full");
    expect(() => validateRawGitHubData(raw)).not.toThrow();
  });

  it("sends only variables and the documented page sizes", async () => {
    const { source, github } = setup(SMALL);
    await source.getProfile("octo-dev");
    const call = github.repositoryPageCalls()[0];
    expect(call.graphqlQuery).toBe(REPOSITORIES_QUERY);
    expect(call.graphqlVariables).toEqual({
      login: "Octo-Dev",
      first: GRAPHQL_REPOS_PER_PAGE,
      after: null,
      langs: GRAPHQL_LANGUAGES_PER_REPO,
    });
    expect(REPOSITORIES_QUERY).not.toContain("Octo-Dev");
  });

  it("maps stars and forks exactly", async () => {
    const { source } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");
    const byName = Object.fromEntries(raw.repositories.items.map((r) => [r.name, r]));
    expect(byName.alpha).toMatchObject({ isFork: false, stars: 10, forks: 2 });
    expect(byName["big-fork"]).toMatchObject({ isFork: true, stars: 999, forks: 99 });
  });

  it("excludes forks from stars, forks and languages through the normal pipeline", async () => {
    const { source } = setup(SMALL);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));
    expect(profile.ownRepositories.value).toBe(4);
    expect(profile.starsReceived.value).toBe(10);
    expect(profile.forksReceived.value).toBe(2);
    expect(profile.languages.map((l) => l.name).sort()).toEqual(["CSS", "TypeScript"]);
    // The fork's 900 kB of Rust never shows up.
    expect(profile.languages.find((l) => l.name === "Rust")).toBeUndefined();
  });

  it("aggregates language bytes and per-language repository presence", async () => {
    const { source } = setup(SMALL);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));
    expect(profile.languages.find((l) => l.name === "TypeScript")).toMatchObject({ bytes: 10_000, repoCount: 2 });
    expect(profile.languages.find((l) => l.name === "CSS")).toMatchObject({ bytes: 2_000, repoCount: 1 });
    expect(profile.languagesCoverage).toBe("full");
  });

  it("keeps the whole language breakdown, not just the primary language", async () => {
    const { source } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");
    expect(raw.repositories.items.find((r) => r.name === "alpha")?.languages).toEqual({ TypeScript: 8000, CSS: 2000 });
  });

  it("a repository without languages stays empty and full (nothing is missing)", async () => {
    const { source } = setup(SMALL);
    const raw = await source.getProfile("octo-dev");
    expect(raw.repositories.items.find((r) => r.name === "empty")?.languages).toEqual({});
    expect(raw.repositories.items.find((r) => r.name === "docs-only")?.languages).toEqual({});
    expect(raw.languagesCoverage).toBe("full");
  });

  it("builds a character with the real engine", async () => {
    const { source } = setup(SMALL);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));
    expect(createRPGCharacter(profile).skills.map((s) => s.name)).toEqual(["TypeScript", "CSS"]);
  });
});

describe("parity with the REST path", () => {
  const dataset: FakeGitHubOptions = {
    ...SMALL,
    repos: [
      ...(SMALL.repos ?? []),
      { name: "polyglot", stars: 3, languages: { Python: 5, Go: 4, Rust: 3, C: 2, Zig: 1 } },
      { name: "zeroed", languages: { Shell: 0 } },
    ],
  };

  it("returns the same repositories, languages and coverage as the REST transport", async () => {
    const viaGraphQL = await setup(dataset).source.getProfile("octo-dev");
    const viaRest = await setup(dataset, { repositoryTransport: "rest" }).source.getProfile("octo-dev");
    expect(viaGraphQL.repositories).toEqual(viaRest.repositories);
    expect(viaGraphQL.languagesCoverage).toEqual(viaRest.languagesCoverage);
  });

  it("normalizes to the same DeveloperProfile and the same character", async () => {
    const make = async (transport: "auto" | "rest") =>
      normalizeDeveloperProfile(
        validateRawGitHubData(await setup(dataset, { repositoryTransport: transport }).source.getProfile("octo-dev"))
      );
    const [a, b] = [await make("auto"), await make("rest")];
    expect(a).toEqual(b);
    expect(createRPGCharacter(a)).toEqual(createRPGCharacter(b));
  });
});

describe("pagination", () => {
  it("walks every page with the previous endCursor", async () => {
    const { source, github } = setup({ repos: manyRepos(120) });
    const raw = await source.getProfile("octo-dev");

    expect(raw.repositories.items).toHaveLength(120);
    expect(raw.repositories.items.map((r) => r.name)).toEqual(manyRepos(120).map((r) => r.name));
    expect(raw.repositories.coverage).toBe("full");
    expect(raw.languagesCoverage).toBe("full");
    // 120 repositories at 50 per page = 3 pages (50 + 50 + 20), never one query per repository.
    expect(github.repositoryPageCalls().map((c) => c.graphqlVariables?.after)).toEqual([null, "c50", "c100"]);
    expect(github.languageCalls()).toHaveLength(0);
  });

  it("aggregates languages across pages", async () => {
    const { source } = setup({ repos: manyRepos(120) });
    const profile = normalizeDeveloperProfile(validateRawGitHubData(await source.getProfile("octo-dev")));
    expect(profile.languages).toEqual([{ name: "Go", bytes: 12_000, repoCount: 120 }]);
  });

  it("handles a list that ends exactly at a page boundary", async () => {
    const { source, github } = setup({ repos: manyRepos(GRAPHQL_REPOS_PER_PAGE) });
    const raw = await source.getProfile("octo-dev");
    expect(raw.repositories.items).toHaveLength(GRAPHQL_REPOS_PER_PAGE);
    expect(github.repositoryPageCalls()).toHaveLength(1);
  });

  it("many repositories: 600 repos cost 12 repository pages, not 600 requests", async () => {
    const { source, github } = setup({ createdAt: "2026-01-10T00:00:00Z", repos: manyRepos(600) });
    const raw = await source.getProfile("octo-dev");
    expect(raw.repositories.items).toHaveLength(600);
    expect(github.repositoryPageCalls()).toHaveLength(12);
    expect(github.count("rest") + github.count("graphql")).toBe(1 + 12 + 1);
    expect(raw.languagesCoverage).toBe("full");
  });

  it("marks everything partial when the page safety limit is hit", async () => {
    const total = GRAPHQL_REPOS_PER_PAGE * MAX_GRAPHQL_REPO_PAGES + 10;
    const { source, github } = setup({ repos: manyRepos(total) });
    const raw = await source.getProfile("octo-dev");

    expect(github.repositoryPageCalls()).toHaveLength(MAX_GRAPHQL_REPO_PAGES);
    expect(raw.repositories.items).toHaveLength(GRAPHQL_REPOS_PER_PAGE * MAX_GRAPHQL_REPO_PAGES);
    expect(raw.repositories.coverage).toBe("partial");
    const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
    expect(profile.languagesCoverage).toBe("partial"); // languages can never be more complete than the list
  });

  it("marks repositories partial when GitHub reports more public repos than were listed", async () => {
    const { source } = setup({ repos: [{ name: "a", languages: { Go: 1 } }], publicRepos: 3 });
    const raw = await source.getProfile("octo-dev");
    expect(raw.repositories.coverage).toBe("partial");
    expect(normalizeDeveloperProfile(validateRawGitHubData(raw)).languagesCoverage).toBe("partial");
  });

  it("never counts a repository twice if a push shifts the cursor between pages", async () => {
    const repos = manyRepos(60);
    const { source, github } = setup({ repos, publicRepos: 60 });
    // The second page repeats the last repository of the first one.
    github.overrides.push((call) => {
      if (!isRepositoriesQuery(call.graphqlQuery) || call.graphqlVariables?.after !== "c50") return undefined;
      const nodes = [repos[49], ...repos.slice(50)].map((r) => ({
        name: r.name,
        isFork: false,
        stargazerCount: 1,
        forkCount: 0,
        languages: { totalCount: 1, edges: [{ size: 100, node: { name: "Go" } }] },
      }));
      return repositoriesResponse({
        data: { user: { repositories: { pageInfo: { hasNextPage: false, endCursor: "c60" }, nodes } } },
      });
    });
    const raw = await source.getProfile("octo-dev");
    expect(raw.repositories.items).toHaveLength(60);
    expect(new Set(raw.repositories.items.map((r) => r.name)).size).toBe(60);
    expect(raw.repositories.coverage).toBe("full");
  });

  it("stops and reports partial when GitHub says there is a next page but gives no cursor", async () => {
    const { source, github } = setup({ repos: manyRepos(5), publicRepos: 5 });
    github.overrides.push((call) =>
      isRepositoriesQuery(call.graphqlQuery)
        ? repositoriesResponse({
            data: { user: { repositories: { pageInfo: { hasNextPage: true, endCursor: null }, nodes: [] } } },
          })
        : undefined
    );
    const raw = await source.getProfile("octo-dev");
    expect(github.repositoryPageCalls()).toHaveLength(1);
    expect(raw.repositories.coverage).toBe("partial");
  });
});

describe("languages coverage", () => {
  const polyglot = (languages: number): Record<string, number> =>
    Object.fromEntries(Array.from({ length: languages }, (_, i) => [`Lang${i}`, 1000 - i]));

  it("a repository with more languages than the query reads falls back to REST /languages for that repository only", async () => {
    const wide = GRAPHQL_LANGUAGES_PER_REPO + 5;
    const { source, github } = setup({
      repos: [
        { name: "wide", languages: polyglot(wide) },
        { name: "narrow", languages: { Go: 10 } },
      ],
    });
    const raw = await source.getProfile("octo-dev");

    expect(github.languageCalls().map((c) => c.path)).toEqual(["/repos/octo-dev/wide/languages"]);
    expect(Object.keys(raw.repositories.items[0].languages)).toHaveLength(wide);
    expect(raw.languagesCoverage).toBe("full");
  });

  it("a repository whose languages GitHub returns as null is read through REST", async () => {
    const { source, github } = setup({ repos: [{ name: "blocked", languages: { Go: 10 }, languagesNull: true }] });
    const raw = await source.getProfile("octo-dev");
    expect(github.languageCalls()).toHaveLength(1);
    expect(raw.repositories.items[0].languages).toEqual({ Go: 10 });
    expect(raw.languagesCoverage).toBe("full");
  });

  it("partial when the REST fallback cannot read the repository either (451)", async () => {
    const { source } = setup({
      repos: [
        { name: "dmca", languagesNull: true, languagesStatus: 451 },
        { name: "ok", languages: { Go: 1 } },
      ],
    });
    const raw = await source.getProfile("octo-dev");
    expect(raw.languagesCoverage).toBe("partial");
    expect(raw.repositories.coverage).toBe("full");
  });

  it("hybrid fallback is capped (150) and in list order: the rest is partial, never silently complete", async () => {
    const repos = Array.from({ length: 155 }, (_, i) => ({
      name: `wide-${i}`,
      stars: 1,
      languages: polyglot(GRAPHQL_LANGUAGES_PER_REPO + 1),
    }));
    const { source, github } = setup({ repos });
    const raw = await source.getProfile("octo-dev");

    const asked = github.languageCalls().map((c) => c.path);
    expect(asked).toHaveLength(150);
    expect(asked).not.toContain("/repos/octo-dev/wide-150/languages");
    expect(raw.languagesCoverage).toBe("partial");
    expect(raw.repositories.coverage).toBe("full"); // stars/forks stay exact
    expect(normalizeDeveloperProfile(validateRawGitHubData(raw)).starsReceived).toEqual({ value: 155, coverage: "full" });
  });

  it("forks never trigger a fallback even when their languages are unreadable", async () => {
    const { source, github } = setup({
      repos: [
        { name: "f", fork: true, languagesNull: true },
        { name: "a", languages: { Go: 1 } },
      ],
    });
    const raw = await source.getProfile("octo-dev");
    expect(github.languageCalls()).toHaveLength(0);
    expect(raw.languagesCoverage).toBe("full");
  });
});

describe("transport selection", () => {
  it("without a token it stays on anonymous REST (no GraphQL at all)", async () => {
    const { source, github } = setup(SMALL, { token: undefined });
    const raw = await source.getProfile("octo-dev");
    expect(github.count("graphql")).toBe(0);
    expect(github.languageCalls()).toHaveLength(4); // alpha, beta, empty (size lags a fresh push), docs-only
    expect(raw.languagesCoverage).toBe("full");
    expect(raw.commits.coverage).toBe("unavailable");
  });

  it('repositoryTransport "rest" forces the per-repository path even with a token', async () => {
    const { source, github } = setup(SMALL, { repositoryTransport: "rest" });
    await source.getProfile("octo-dev");
    expect(github.repositoryPageCalls()).toHaveLength(0);
    expect(github.languageCalls()).toHaveLength(4);
  });

  it("reports the request breakdown", async () => {
    const reports: Array<{ rest: number; graphql: number; total: number }> = [];
    const { source } = setup(SMALL, {
      onReport: (r) => reports.push({ rest: r.restRequests, graphql: r.graphqlRequests, total: r.totalRequests }),
    });
    await source.getProfile("octo-dev");
    expect(reports).toEqual([{ rest: 1, graphql: 2, total: 3 }]);
  });
});

describe("errors", () => {
  it("a GraphQL rate limit while reading repositories surfaces as GitHubRateLimitError", async () => {
    const { source, github } = setup(SMALL);
    github.overrides.push((call) =>
      isRepositoriesQuery(call.graphqlQuery)
        ? repositoriesResponse({ errors: [{ type: "RATE_LIMITED", message: "x" }] })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubRateLimitError);
  });

  it("a malformed repositories payload is rejected, never partially trusted", async () => {
    const { source, github } = setup(SMALL);
    github.overrides.push((call) =>
      isRepositoriesQuery(call.graphqlQuery)
        ? repositoriesResponse({ data: { user: { repositories: { nodes: [{ name: "a" }] } } } })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toThrow(/repositories/);
  });
});
