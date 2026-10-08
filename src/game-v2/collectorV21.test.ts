import { describe, expect, it } from "vitest";
import { collectGitHubEvidenceV21, createManifestCacheKey, createTreeCacheKey, discoverManifestCandidates, selectManifestCandidates, type GitTreeItem, type GitTreeSnapshot } from "./collectorV21";
import { DETECTOR_VERSION } from "./constants";
import { normalizeRepositoryEvidence } from "./evidence";
import type { RawRepositoryEvidence } from "./types";
import type { RepositoryDiscoverySnapshot } from "@/data/sharedDiscovery";
import { makeAverageProfile } from "@/test/builders";
import { createRPGCharacterV2 } from "./engine";
import { GitHubRateLimitError, GitHubUnavailableError } from "@/data/github/errors";

const blob = (path: string, index = 0): GitTreeItem => ({ path, type: "blob", url: `https://api.github.test/blobs/${index}`, sha: `sha-${index}`, size: 100 });

describe("Evidence Collector V2.1 discovery", () => {
  it("discovers root and workspace manifests across supported ecosystems", () => {
    const paths = [
      "package.json", "pnpm-workspace.yaml", "apps/web/package.json", "packages/ui/package.json",
      "services/api/pyproject.toml", "services/legacy/requirements-dev.txt",
      "java/pom.xml", "kotlin/settings.gradle.kts", "kotlin/app/build.gradle.kts",
      "dotnet/Web/Web.csproj", "dotnet/Directory.Packages.props", "mobile/pubspec.yaml",
    ];
    const candidates = discoverManifestCandidates(paths.map(blob));
    expect(candidates.map((item) => item.path)).toEqual(expect.arrayContaining(paths));
    expect(new Set(candidates.filter((item) => item.tier === "A").map((item) => item.projectId)).size).toBeGreaterThanOrEqual(7);
  });

  it("excludes vendored/generated paths and demotes contextual examples without excluding the repo", () => {
    const candidates = discoverManifestCandidates([
      blob("vendor/app/package.json", 1), blob("third_party/lib/package.json", 2), blob("dist/package.json", 3),
      blob("examples/demo/package.json", 4), blob("fixtures/fake/package.json", 5), blob("package.json", 6),
    ]);
    expect(candidates.some((item) => /vendor|third_party|dist|fixtures/.test(item.path))).toBe(false);
    expect(candidates.find((item) => item.path === "examples/demo/package.json")?.contextWeight).toBe(0.5);
    expect(candidates[0].path).toBe("package.json");
  });

  it("selects manifests deterministically, spreads primary files across projects, and records exhaustion", () => {
    const candidates = discoverManifestCandidates(Array.from({ length: 10 }, (_, index) => blob(`packages/p${index}/package.json`, index)));
    const first = selectManifestCandidates(candidates, 4);
    const second = selectManifestCandidates([...candidates].reverse(), 4);
    expect(first.selected.map((item) => item.path)).toEqual(second.selected.map((item) => item.path));
    expect(first.selected).toHaveLength(4);
    expect(first.skipped).toHaveLength(6);
    expect(first.projects).toHaveLength(10);
  });

  it("keeps module recurrence distinct from repository recurrence", () => {
    const repo: RawRepositoryEvidence = {
      id: "mono", name: "mono", isFork: false, isArchived: false, isEmpty: false, stars: 1,
      pushedAt: "2026-01-01T00:00:00Z", languages: {},
      files: Array.from({ length: 10 }, (_, index) => ({ path: `packages/p${index}/package.json`, content: JSON.stringify({ dependencies: { react: "*" } }), projectId: `packages/p${index}` })),
    };
    const normalized = normalizeRepositoryEvidence({ repositories: [repo], coverage: { coverage: "full", eligible: 1, examined: 1, failed: 0, omittedByBudget: 0 }, requests: { rest: 0, graphql: 0, manifestFetches: 0, reposInspected: 1, cacheHits: 0 } });
    expect(normalized.evidence.filter((item) => item.itemId === "react")).toHaveLength(1);
  });

  it("versions tree and manifest cache keys by immutable SHA", () => {
    expect(createTreeCacheKey("repo", "sha-a")).not.toBe(createTreeCacheKey("repo", "sha-b"));
    expect(createManifestCacheKey("repo", "package.json", "sha-a")).not.toBe(createManifestCacheKey("repo", "package.json", "sha-b"));
    expect(createTreeCacheKey("repo", "sha-a")).toContain(encodeURIComponent(DETECTOR_VERSION));
  });
});

function response(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...headers } });
}

function failedResponse(status: number): Response {
  return new Response(JSON.stringify({ message: "temporary failure" }), { status, headers: { "content-type": "application/json" } });
}

function mockCollectorFetch(options: { truncated?: boolean; manifests?: number } = {}): typeof fetch {
  const manifests = options.manifests ?? 1;
  return (async (input, init) => {
    const url = String(input);
    if (url.includes("/users/") && url.includes("/repos?")) return response([{ id: 1, name: "app", fork: false, archived: false, size: 10, stargazers_count: 2, pushed_at: "2026-01-01T00:00:00Z", default_branch: "main", language: "TypeScript" }], { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "52" });
    if (url.includes("/git/trees/")) return response({ sha: "tree-sha", truncated: Boolean(options.truncated), tree: Array.from({ length: manifests }, (_, index) => blob(index === 0 ? "package.json" : `packages/p${index}/package.json`, index)) }, { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "51" });
    if (url.endsWith("/graphql")) {
      const query = JSON.parse(String(init?.body)) as { query: string };
      const aliases = [...query.query.matchAll(/r(\d+):repository/g)].map((match) => Number(match[1]));
      return response({ data: Object.fromEntries(aliases.map((index) => [`r${index}`, { o: { text: JSON.stringify({ dependencies: { next: "*" } }), byteSize: 30, isBinary: false } }])) }, { "x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4999" });
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
}

describe("Evidence Collector V2.1 accounting and coverage", () => {
  it("reuses neutral repository discovery and removes exactly one REST request", async () => {
    const repositoryDiscovery: RepositoryDiscoverySnapshot = {
      username: "octocat",
      fetchedAt: "2026-01-01T00:00:00.000Z",
      sourceRepositoryCount: 1,
      collectorWindowComplete: true,
      repositories: [{ id: "1", name: "app", isFork: false, isArchived: false, isEmpty: false, stars: 2, pushedAt: "2026-01-01T00:00:00Z", defaultBranch: "main", languages: {}, size: 10, primaryLanguage: "TypeScript" }],
    };
    const before = await collectGitHubEvidenceV21("octocat", { token: "test", fetch: mockCollectorFetch(), referenceDate: "2026-01-01", sourceFingerprint: "before" });
    const after = await collectGitHubEvidenceV21("octocat", { token: "test", fetch: mockCollectorFetch(), repositoryDiscovery, referenceDate: "2026-01-01", sourceFingerprint: "after" });
    expect(before.requests.repositoryDiscovery).toBe("fetched");
    expect(after.requests.repositoryDiscovery).toBe("reused");
    expect(after.requests.rest).toBe(before.requests.rest - 1);
    expect(after.requests.graphql).toBe(before.requests.graphql);
    expect(after.requests.rateLimitLimit).toBe(before.requests.rateLimitLimit);
    expect(after.coverage).toEqual(before.coverage);
    expect(after.evidence).toEqual(before.evidence);
    const beforeCharacter = createRPGCharacterV2({ profile: makeAverageProfile(), evidence: before });
    const afterCharacter = createRPGCharacterV2({ profile: makeAverageProfile(), evidence: after });
    const { requests: _beforeRequests, ...beforeSemantic } = beforeCharacter;
    const { requests: _afterRequests, ...afterSemantic } = afterCharacter;
    expect(afterSemantic).toEqual(beforeSemantic);
  });

  it("uses tree-first discovery plus batched manifests and never hides budget skips", async () => {
    const evidence = await collectGitHubEvidenceV21("octocat", { token: "test", fetch: mockCollectorFetch({ manifests: 13 }), referenceDate: "2026-01-01", sourceFingerprint: "budget" });
    expect(evidence.requests.rest).toBe(2);
    expect(evidence.requests.treeRequests).toBe(1);
    expect(evidence.requests.graphql).toBe(1);
    expect(evidence.requests.manifestsSkippedByBudget).toBe(3);
    expect(evidence.coverage.coverage).toBe("partial");
    expect(evidence.coverage.gap).toBe("large");
  });

  it("marks complete, partial, and unavailable collection states truthfully", async () => {
    const full = await collectGitHubEvidenceV21("octocat", { token: "test", fetch: mockCollectorFetch(), referenceDate: "2026-01-01", sourceFingerprint: "full" });
    const partial = await collectGitHubEvidenceV21("octocat", { token: "test", fetch: mockCollectorFetch({ truncated: true }), referenceDate: "2026-01-01", sourceFingerprint: "partial" });
    const unavailable = await collectGitHubEvidenceV21("octocat", { fetch: (() => Promise.reject(new Error("offline"))) as typeof fetch, referenceDate: "2026-01-01", sourceFingerprint: "unavailable" });
    expect(full.coverage.coverage).toBe("full");
    expect(partial.coverage.coverage).toBe("partial");
    expect(unavailable.coverage.coverage).toBe("unavailable");
  });

  it("turns a repository-list 502 into unavailable evidence without leaking the raw response", async () => {
    const evidence = await collectGitHubEvidenceV21("octocat", { fetch: (async () => failedResponse(502)) as typeof fetch, referenceDate: "2026-01-01", sourceFingerprint: "repo-502" });
    expect(evidence.coverage.coverage).toBe("unavailable");
    expect(evidence.warnings).toContain("manifest_evidence_unavailable");
    expect(JSON.stringify(evidence)).not.toContain("temporary failure");
  });

  it("distinguishes a permission 403 from a GitHub rate-limit response", async () => {
    let forbidden: unknown;
    await collectGitHubEvidenceV21("octocat", {
      fetch: (async () => new Response(JSON.stringify({ message: "Resource not accessible" }), { status: 403, headers: { "content-type": "application/json", "x-ratelimit-remaining": "100" } })) as typeof fetch,
      onError: (error) => { forbidden = error; },
    });
    expect(forbidden).toBeInstanceOf(GitHubUnavailableError);
    expect(forbidden).not.toBeInstanceOf(GitHubRateLimitError);

    let limited: unknown;
    await collectGitHubEvidenceV21("octocat", {
      fetch: (async () => new Response(JSON.stringify({ message: "slow down" }), { status: 429, headers: { "content-type": "application/json", "retry-after": "30" } })) as typeof fetch,
      onError: (error) => { limited = error; },
    });
    expect(limited).toBeInstanceOf(GitHubRateLimitError);
  });

  it("marks a tree failure unavailable and a partial manifest batch honestly partial", async () => {
    const treeFailure = await collectGitHubEvidenceV21("octocat", {
      token: "test",
      fetch: (async (input) => String(input).includes("/git/trees/") ? failedResponse(502) : mockCollectorFetch()(input)) as typeof fetch,
      referenceDate: "2026-01-01", sourceFingerprint: "tree-502",
    });
    const partialBatch = await collectGitHubEvidenceV21("octocat", {
      token: "test",
      fetch: (async (input, init) => String(input).endsWith("/graphql") ? response({ data: {} }) : mockCollectorFetch()(input, init)) as typeof fetch,
      referenceDate: "2026-01-01", sourceFingerprint: "partial-batch",
    });
    expect(treeFailure.coverage.coverage).toBe("unavailable");
    expect(partialBatch.coverage.coverage).toBe("partial");
    expect(partialBatch.coverage.failed).toBeGreaterThan(0);
  });

  it("reuses tree and blob caches while profile cache remains independently versioned", async () => {
    const treeCache = new Map<string, GitTreeSnapshot>();
    const manifestCache = new Map<string, string>();
    const fetchImpl = mockCollectorFetch();
    await collectGitHubEvidenceV21("octocat", { token: "test", fetch: fetchImpl, treeCache, manifestCache, referenceDate: "2026-01-01", sourceFingerprint: "cache-a" });
    const second = await collectGitHubEvidenceV21("octocat", { token: "test", fetch: fetchImpl, treeCache, manifestCache, referenceDate: "2026-01-01", sourceFingerprint: "cache-b" });
    expect(second.requests.treeCacheHits).toBe(1);
    expect(second.requests.manifestCacheHits).toBe(1);
    expect(second.requests.treeRequests).toBe(0);
    expect(second.requests.graphql).toBe(0);
  });
});
