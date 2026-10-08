import { performance } from "node:perf_hooks";
import { parseGitHubUsername } from "@/data/github/username";
import { CONTEXTUAL_PATH, DETECTOR_VERSION, IGNORED_PATH, V2_BALANCE } from "./constants";
import { createEvidenceCacheKey, type SyncCacheStore } from "./cache";
import { normalizeRepositoryEvidence, selectRepositories } from "./evidence";
import type { ProjectEvidence, RawEvidenceCollection, RawRepositoryEvidence, RepositorySourceFile, RequestAccounting, TechnologyEvidenceProfile } from "./types";

interface GitHubRepoJson {
  id?: number; name?: string; fork?: boolean; archived?: boolean; size?: number;
  stargazers_count?: number; pushed_at?: string; default_branch?: string; language?: string | null;
}
export interface GitTreeItem { path?: string; type?: string; url?: string; sha?: string; size?: number }
export interface GitTreeSnapshot { sha: string; truncated: boolean; items: GitTreeItem[] }
interface GitTreeJson { sha?: string; tree?: GitTreeItem[]; truncated?: boolean }
interface BlobJson { content?: string; encoding?: string }

export type ManifestTier = "A" | "B" | "C";
export interface ManifestCandidate {
  path: string;
  blobUrl: string;
  blobSha: string;
  size: number;
  tier: ManifestTier;
  projectId: string;
  contextWeight: number;
  utility: number;
}

export interface GitHubEvidenceCollectorV21Options {
  token?: string;
  fetch?: typeof fetch;
  cache?: SyncCacheStore<string, TechnologyEvidenceProfile>;
  treeCache?: SyncCacheStore<string, GitTreeSnapshot>;
  manifestCache?: SyncCacheStore<string, string>;
  referenceDate?: string;
  sourceFingerprint?: string;
  timeoutMs?: number;
  treeConcurrency?: number;
  signal?: AbortSignal;
  /** Observation only: reporting must not change collector decisions or limits. */
  onError?: (error: unknown, phase: "repositories" | "trees" | "manifests") => void;
}

const PRIMARY = /(^|\/)(package\.json|requirements[^/]*\.txt|pyproject\.toml|Gemfile|composer\.json|pom\.xml|build\.gradle(?:\.kts)?|[^/]+\.csproj|pubspec\.yaml)$/i;
const STRUCTURAL = /(^|\/)(pnpm-workspace\.yaml|settings\.gradle(?:\.kts)?|Directory\.Packages\.props|next\.config\.[^/]+|nuxt\.config\.[^/]+|svelte\.config\.[^/]+|astro\.config\.[^/]+|vite\.config\.[^/]+|webpack\.config\.[^/]+|rollup\.config\.[^/]+|playwright\.config\.[^/]+|vitest\.config\.[^/]+|jest\.config\.[^/]+|cypress\.config\.[^/]+|tailwind\.config\.[^/]+|components\.json|Dockerfile|docker-compose\.ya?ml|compose\.ya?ml|\.github\/workflows\/[^/]+\.ya?ml|[^/]+\.tf|eslint\.config\.[^/]+|\.eslintrc[^/]*|prettier\.config\.[^/]+|\.prettierrc[^/]*)$/i;
const LOCK = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Gemfile\.lock|composer\.lock)$/i;

function apiHeaders(token?: string): HeadersInit {
  return { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "github-rpg-v2-experimental", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function normalizedPath(value: string): string { return value.replace(/\\/g, "/").replace(/^\.\//, ""); }
function dirname(value: string): string { const parts = normalizedPath(value).split("/"); parts.pop(); return parts.join("/") || "."; }
function depth(value: string): number { return normalizedPath(value).split("/").length - 1; }

export function createTreeCacheKey(repoId: string, treeSha: string): string {
  return ["tree", DETECTOR_VERSION, repoId, treeSha].map(encodeURIComponent).join("/");
}

function createTreeHeadCacheKey(repoId: string, branch: string): string {
  return ["tree-head", DETECTOR_VERSION, repoId, branch].map(encodeURIComponent).join("/");
}

export function createManifestCacheKey(repoId: string, path: string, blobSha: string): string {
  return ["manifest", DETECTOR_VERSION, repoId, normalizedPath(path), blobSha].map(encodeURIComponent).join("/");
}

function classify(path: string): ManifestTier | null {
  if (PRIMARY.test(path)) return "A";
  if (STRUCTURAL.test(path)) return "B";
  if (LOCK.test(path)) return "C";
  return null;
}

export function discoverManifestCandidates(items: readonly GitTreeItem[]): ManifestCandidate[] {
  return items.flatMap((item): ManifestCandidate[] => {
    if (item.type !== "blob" || !item.path || !item.url || !item.sha) return [];
    const path = normalizedPath(item.path);
    const tier = classify(path);
    if (!tier || IGNORED_PATH.test(path) || (item.size ?? 0) > V2_BALANCE.maxFileBytes) return [];
    const contextWeight = CONTEXTUAL_PATH.test(path) ? 0.5 : 1;
    const projectId = tier === "B" && path.startsWith(".github/workflows/") ? "." : dirname(path);
    const utility = (tier === "A" ? 300 : tier === "B" ? 200 : 100) + (contextWeight === 1 ? 50 : 0) - depth(path);
    return [{ path, blobUrl: item.url, blobSha: item.sha, size: item.size ?? 0, tier, projectId, contextWeight, utility }];
  }).sort((a, b) => b.utility - a.utility || a.projectId.localeCompare(b.projectId, "en") || a.path.localeCompare(b.path, "en"));
}

/** Selects useful manifests deterministically, spreading Tier A across project roots first. */
export function selectManifestCandidates(candidates: readonly ManifestCandidate[], limit: number = V2_BALANCE.maxManifestsPerRepository): { selected: ManifestCandidate[]; skipped: ManifestCandidate[]; projects: ProjectEvidence[] } {
  const selected: ManifestCandidate[] = [];
  const seenPaths = new Set<string>();
  const add = (candidate: ManifestCandidate) => {
    if (selected.length < limit && !seenPaths.has(candidate.path)) { selected.push(candidate); seenPaths.add(candidate.path); }
  };
  const primaryByProject = new Map<string, ManifestCandidate[]>();
  for (const candidate of candidates.filter((item) => item.tier === "A")) primaryByProject.set(candidate.projectId, [...(primaryByProject.get(candidate.projectId) ?? []), candidate]);
  for (const project of [...primaryByProject.keys()].sort((a, b) => a.localeCompare(b, "en"))) add(primaryByProject.get(project)![0]);
  for (const tier of ["A", "B", "C"] as const) for (const candidate of candidates) if (candidate.tier === tier) add(candidate);
  const skipped = candidates.filter((candidate) => !seenPaths.has(candidate.path));
  const projects = [...primaryByProject.entries()].map(([root, manifests]) => ({ id: root, root, manifestPaths: manifests.map((item) => item.path).sort((a, b) => a.localeCompare(b, "en")) }));
  return { selected, skipped, projects };
}

async function limitedMap<T, R>(values: readonly T[], concurrency: number, work: (value: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) { const index = cursor++; results[index] = await work(values[index], index); }
  });
  await Promise.all(workers);
  return results;
}

async function requestJson(fetchImpl: typeof fetch, url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<{ body: unknown; response: Response }> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const response = await fetchImpl(url, { ...init, cache: "no-store", signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal });
  if (!response.ok) throw new Error(`github_v21_http_${response.status}`);
  return { body: await response.json(), response };
}

function updateRateLimit(response: Response, accounting: RequestAccounting): void {
  const value = response.headers.get("x-ratelimit-remaining");
  if (value !== null && Number.isFinite(Number(value))) accounting.rateLimitRemaining = Number(value);
}

async function fetchManifestRest(fetchImpl: typeof fetch, candidate: ManifestCandidate, token: string | undefined, accounting: RequestAccounting, timeoutMs: number, signal?: AbortSignal): Promise<string> {
  accounting.rest++; accounting.manifestRequests = (accounting.manifestRequests ?? 0) + 1; accounting.fallbackRequests = (accounting.fallbackRequests ?? 0) + 1;
  const { body, response } = await requestJson(fetchImpl, candidate.blobUrl, { headers: apiHeaders(token) }, timeoutMs, signal);
  updateRateLimit(response, accounting);
  const blob = body as BlobJson;
  if (blob.encoding !== "base64" || typeof blob.content !== "string") throw new Error("github_v21_manifest_invalid");
  return Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8");
}

interface FetchTarget { repo: RawRepositoryEvidence; branch: string; candidate: ManifestCandidate }

async function fetchGraphqlBatch(fetchImpl: typeof fetch, owner: string, targets: readonly FetchTarget[], token: string, accounting: RequestAccounting, timeoutMs: number, signal?: AbortSignal): Promise<Map<string, string>> {
  const fields = targets.map((target, index) => `r${index}:repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(target.repo.name)}){o:object(expression:${JSON.stringify(`${target.branch}:${target.candidate.path}`)}){... on Blob{text byteSize isBinary}}}`).join("\n");
  accounting.graphql++; accounting.manifestRequests = (accounting.manifestRequests ?? 0) + 1;
  const { body, response } = await requestJson(fetchImpl, "https://api.github.com/graphql", { method: "POST", headers: { ...apiHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify({ query: `query CollectorV21{${fields}}` }) }, timeoutMs, signal);
  updateRateLimit(response, accounting);
  const parsed = body as { data?: Record<string, { o?: { text?: string; byteSize?: number; isBinary?: boolean } | null }>; errors?: unknown[] };
  if (!parsed.data) throw new Error("github_v21_graphql_invalid");
  const result = new Map<string, string>();
  targets.forEach((target, index) => {
    const blob = parsed.data?.[`r${index}`]?.o;
    if (blob && !blob.isBinary && typeof blob.text === "string" && (blob.byteSize ?? 0) <= V2_BALANCE.maxFileBytes) result.set(createManifestCacheKey(target.repo.id, target.candidate.path, target.candidate.blobSha), blob.text);
  });
  return result;
}

export async function collectGitHubEvidenceV21(usernameInput: string, options: GitHubEvidenceCollectorV21Options = {}): Promise<TechnologyEvidenceProfile> {
  const username = parseGitHubUsername(usernameInput);
  const cacheKey = createEvidenceCacheKey({ username, sourceFingerprint: `${options.sourceFingerprint ?? "live-github-manifests"}:collector-v21`, referenceDate: options.referenceDate ?? "unversioned-reference-date" });
  const cached = options.cache?.get(cacheKey);
  if (cached) return { ...cached, requests: { ...cached.requests, cacheHits: cached.requests.cacheHits + 1 } };
  const fetchImpl = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? V2_BALANCE.collectorTimeoutMs;
  const accounting: RequestAccounting = { rest: 0, graphql: 0, manifestFetches: 0, reposInspected: 0, cacheHits: 0, treeRequests: 0, manifestRequests: 0, fallbackRequests: 0, treeCacheHits: 0, manifestCacheHits: 0, manifestsDiscovered: 0, manifestsSkippedByBudget: 0, projectsDiscovered: 0, rateLimitRemaining: null };
  const selectionStarted = performance.now();
  let listed: unknown;
  try {
    accounting.rest++;
    const response = await requestJson(fetchImpl, `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=100`, { headers: apiHeaders(options.token) }, timeoutMs, options.signal);
    listed = response.body; updateRateLimit(response.response, accounting);
  } catch (error) {
    options.onError?.(error, "repositories");
    return normalizeRepositoryEvidence({ repositories: [], coverage: { coverage: "unavailable", eligible: 0, examined: 0, failed: 1, omittedByBudget: 0, reposCandidates: 0, gap: "large" }, requests: accounting });
  }
  if (!Array.isArray(listed)) throw new Error("github_v21_repository_list_invalid");
  const repoRows = listed.filter((value): value is GitHubRepoJson => typeof value === "object" && value !== null && typeof (value as GitHubRepoJson).name === "string");
  const branches = new Map(repoRows.map((repo) => [repo.name!, repo.default_branch ?? "HEAD"]));
  const summaries: RawRepositoryEvidence[] = repoRows.map((repo) => ({ id: String(repo.id ?? repo.name), name: repo.name!, isFork: Boolean(repo.fork), isArchived: Boolean(repo.archived), isEmpty: (repo.size ?? 0) === 0, stars: repo.stargazers_count ?? 0, pushedAt: repo.pushed_at ?? "1970-01-01T00:00:00Z", languages: {}, files: [], size: repo.size ?? 0, primaryLanguage: repo.language ?? null }));
  const { selected, eligible } = selectRepositories(summaries);
  const selectionMs = performance.now() - selectionStarted;

  let failed = 0;
  let truncated = 0;
  const treeStarted = performance.now();
  const plans = await limitedMap(selected, options.treeConcurrency ?? V2_BALANCE.treeConcurrency, async (repo) => {
    const branch = branches.get(repo.name) ?? "HEAD";
    try {
      const headKey = createTreeHeadCacheKey(repo.id, branch);
      let snapshot = options.treeCache?.get(headKey);
      if (snapshot) accounting.treeCacheHits = (accounting.treeCacheHits ?? 0) + 1;
      else {
        accounting.rest++; accounting.treeRequests = (accounting.treeRequests ?? 0) + 1;
        const response = await requestJson(fetchImpl, `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: apiHeaders(options.token) }, timeoutMs, options.signal);
        updateRateLimit(response.response, accounting);
        const raw = response.body as GitTreeJson;
        snapshot = { sha: raw.sha ?? branch, truncated: Boolean(raw.truncated), items: raw.tree ?? [] };
        options.treeCache?.set(headKey, snapshot);
        options.treeCache?.set(createTreeCacheKey(repo.id, snapshot.sha), snapshot);
      }
      if (snapshot.truncated) truncated++;
      const candidates = discoverManifestCandidates(snapshot.items);
      const plan = selectManifestCandidates(candidates);
      return { repo, branch, snapshot, ...plan };
    } catch (error) {
      options.onError?.(error, "trees");
      failed++;
      return { repo, branch, snapshot: null, selected: [] as ManifestCandidate[], skipped: [] as ManifestCandidate[], projects: [] as ProjectEvidence[] };
    }
  });
  const treeMs = performance.now() - treeStarted;
  const allTargets = plans.flatMap((plan) => plan.selected.map((candidate) => ({ repo: plan.repo, branch: plan.branch, candidate })));
  const acceptedTargets = allTargets.slice(0, V2_BALANCE.maxManifestsPerProfile);
  const profileSkipped = allTargets.slice(V2_BALANCE.maxManifestsPerProfile);
  const skipped = plans.reduce((sum, plan) => sum + plan.skipped.length, 0) + profileSkipped.length;
  accounting.manifestsDiscovered = plans.reduce((sum, plan) => sum + plan.selected.length + plan.skipped.length, 0);
  accounting.manifestsSkippedByBudget = skipped;
  accounting.projectsDiscovered = plans.reduce((sum, plan) => sum + plan.projects.length, 0);

  const content = new Map<string, string>();
  const uncached = acceptedTargets.filter((target) => {
    const key = createManifestCacheKey(target.repo.id, target.candidate.path, target.candidate.blobSha);
    const hit = options.manifestCache?.get(key);
    if (hit === undefined) return true;
    content.set(key, hit); accounting.manifestCacheHits = (accounting.manifestCacheHits ?? 0) + 1; return false;
  });
  const manifestStarted = performance.now();
  if (options.token) {
    const batches = Array.from({ length: Math.ceil(uncached.length / V2_BALANCE.manifestBatchSize) }, (_, index) => uncached.slice(index * V2_BALANCE.manifestBatchSize, (index + 1) * V2_BALANCE.manifestBatchSize));
    await limitedMap(batches, 2, async (batch) => {
      try {
        const values = await fetchGraphqlBatch(fetchImpl, username, batch, options.token!, accounting, timeoutMs, options.signal);
        for (const [key, value] of values) { content.set(key, value); options.manifestCache?.set(key, value); }
        for (const target of batch) if (!values.has(createManifestCacheKey(target.repo.id, target.candidate.path, target.candidate.blobSha))) failed++;
      } catch (error) {
        options.onError?.(error, "manifests");
        for (const target of batch) {
          if (accounting.rest >= V2_BALANCE.maxManifestRequests) { failed++; continue; }
          try {
            const value = await fetchManifestRest(fetchImpl, target.candidate, options.token, accounting, timeoutMs, options.signal);
            const key = createManifestCacheKey(target.repo.id, target.candidate.path, target.candidate.blobSha);
            content.set(key, value); options.manifestCache?.set(key, value);
          } catch (error) { options.onError?.(error, "manifests"); failed++; }
        }
      }
    });
  } else {
    await limitedMap(uncached, options.treeConcurrency ?? V2_BALANCE.treeConcurrency, async (target) => {
      if (accounting.rest >= V2_BALANCE.maxManifestRequests) { failed++; return; }
      try {
        const value = await fetchManifestRest(fetchImpl, target.candidate, undefined, accounting, timeoutMs, options.signal);
        const key = createManifestCacheKey(target.repo.id, target.candidate.path, target.candidate.blobSha);
        content.set(key, value); options.manifestCache?.set(key, value);
      } catch (error) { options.onError?.(error, "manifests"); failed++; }
    });
  }
  const manifestMs = performance.now() - manifestStarted;
  accounting.manifestFetches = acceptedTargets.length;

  const parsingStarted = performance.now();
  const enrichedById = new Map(plans.map((plan) => {
    const files: RepositorySourceFile[] = acceptedTargets.filter((target) => target.repo.id === plan.repo.id).flatMap((target) => {
      const key = createManifestCacheKey(target.repo.id, target.candidate.path, target.candidate.blobSha);
      const value = content.get(key);
      return value === undefined ? [] : [{ path: target.candidate.path, content: value, blobSha: target.candidate.blobSha, projectId: target.candidate.projectId, contextWeight: target.candidate.contextWeight }];
    });
    return [plan.repo.id, { ...plan.repo, files, projects: plan.projects }] as const;
  }));
  const repositories = summaries.map((repo) => enrichedById.get(repo.id) ?? repo);
  accounting.reposInspected = plans.filter((plan) => plan.snapshot !== null).length;
  const relevantOmissions = skipped + truncated + failed;
  const uncertainRepositoryIds = new Set<string>();
  for (const plan of plans) if (plan.snapshot === null || plan.snapshot.truncated || plan.skipped.length > 0) uncertainRepositoryIds.add(plan.repo.id);
  for (const target of profileSkipped) uncertainRepositoryIds.add(target.repo.id);
  for (const target of acceptedTargets) if (!content.has(createManifestCacheKey(target.repo.id, target.candidate.path, target.candidate.blobSha))) uncertainRepositoryIds.add(target.repo.id);
  const gap = relevantOmissions === 0 ? "none" : relevantOmissions <= Math.max(2, Math.ceil((accounting.manifestsDiscovered ?? 0) * 0.1)) ? "small" : "large";
  const coverage = failed > 0 && accounting.reposInspected === 0 ? "unavailable" : relevantOmissions > 0 ? "partial" : "full";
  const collection: RawEvidenceCollection = {
    repositories,
    coverage: { coverage, eligible: selected.length, examined: accounting.reposInspected, failed, omittedByBudget: skipped, reposCandidates: eligible, treesDiscovered: accounting.reposInspected, treesTruncated: truncated, manifestsDiscovered: accounting.manifestsDiscovered, manifestsFetched: content.size, manifestsSkippedByBudget: skipped, uncertainRepositories: uncertainRepositoryIds.size, gap, domains: { language: "unavailable", school: coverage, artifact: coverage } },
    requests: { ...accounting, timingsMs: { repositorySelection: Math.round(selectionMs), treeDiscovery: Math.round(treeMs), manifestFetch: Math.round(manifestMs), parsing: Math.round(performance.now() - parsingStarted) } },
  };
  const normalized = normalizeRepositoryEvidence(collection);
  options.cache?.set(cacheKey, normalized);
  return normalized;
}
