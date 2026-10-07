import { parseGitHubUsername } from "@/data/github/username";
import { IGNORED_PATH, V2_BALANCE } from "./constants";
import { createEvidenceCacheKey } from "./cache";
import { normalizeRepositoryEvidence, selectRepositories } from "./evidence";
import type { RawEvidenceCollection, RawRepositoryEvidence, RepositorySourceFile, RequestAccounting, TechnologyEvidenceProfile } from "./types";

interface GitHubRepoJson { id?: number; name?: string; fork?: boolean; archived?: boolean; size?: number; stargazers_count?: number; pushed_at?: string; default_branch?: string }
interface GitTreeItem { path?: string; type?: string; url?: string; size?: number }
interface GitTreeJson { tree?: GitTreeItem[]; truncated?: boolean }
interface BlobJson { content?: string; encoding?: string }

export interface GitHubEvidenceCollectorOptions {
  token?: string;
  fetch?: typeof fetch;
  cache?: Map<string, TechnologyEvidenceProfile>;
  referenceDate?: string;
  sourceFingerprint?: string;
}

const TARGET = /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|Gemfile|Gemfile\.lock|composer\.json|pom\.xml|build\.gradle(?:\.kts)?|[^/]+\.csproj|Directory\.Packages\.props|pubspec\.yaml|next\.config\.[^/]+|nuxt\.config\.[^/]+|svelte\.config\.[^/]+|astro\.config\.[^/]+|vite\.config\.[^/]+|webpack\.config\.[^/]+|rollup\.config\.[^/]+|playwright\.config\.[^/]+|vitest\.config\.[^/]+|jest\.config\.[^/]+|cypress\.config\.[^/]+|tailwind\.config\.[^/]+|components\.json|Dockerfile|docker-compose\.ya?ml|compose\.ya?ml|\.github\/workflows\/[^/]+\.ya?ml|[^/]+\.tf|eslint\.config\.[^/]+|\.eslintrc[^/]*|prettier\.config\.[^/]+|\.prettierrc[^/]*)$/i;

function headers(token?: string): HeadersInit {
  return { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "github-rpg-v2-experimental", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function readJson(fetchImpl: typeof fetch, url: string, token: string | undefined, accounting: RequestAccounting): Promise<unknown> {
  accounting.rest++;
  const response = await fetchImpl(url, { headers: headers(token), cache: "no-store" });
  if (!response.ok) throw new Error(`github_v2_collection_failed_${response.status}`);
  return response.json();
}

function isRepo(value: unknown): value is GitHubRepoJson { return typeof value === "object" && value !== null && typeof (value as GitHubRepoJson).name === "string"; }

async function fetchBlob(fetchImpl: typeof fetch, url: string, token: string | undefined, accounting: RequestAccounting): Promise<string> {
  accounting.rest++; accounting.manifestFetches++;
  const response = await fetchImpl(url, { headers: headers(token), cache: "no-store" });
  if (!response.ok) throw new Error(`github_v2_manifest_failed_${response.status}`);
  const body = await response.json() as BlobJson;
  if (body.encoding !== "base64" || typeof body.content !== "string") throw new Error("github_v2_manifest_invalid");
  return Buffer.from(body.content.replace(/\s/g, ""), "base64").toString("utf8");
}

/**
 * Experimental, server-only collector. It is not referenced by the V1 datasource or public UI.
 * Initial budget: 30 selected owned repos, 90 total REST requests, at most 256 KiB per file.
 */
export async function collectGitHubEvidenceV2(usernameInput: string, options: GitHubEvidenceCollectorOptions = {}): Promise<TechnologyEvidenceProfile> {
  const username = parseGitHubUsername(usernameInput);
  const cacheKey = createEvidenceCacheKey({ username, sourceFingerprint: options.sourceFingerprint ?? "live-github-manifests", referenceDate: options.referenceDate ?? "unversioned-reference-date" });
  const cached = options.cache?.get(cacheKey);
  if (cached) return { ...cached, requests: { ...cached.requests, cacheHits: cached.requests.cacheHits + 1 } };
  const fetchImpl = options.fetch ?? fetch;
  const accounting: RequestAccounting = { rest: 0, graphql: 0, manifestFetches: 0, reposInspected: 0, cacheHits: 0 };
  let failed = 0;
  let omittedFilesByBudget = 0;
  let listed: unknown;
  try { listed = await readJson(fetchImpl, `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=100`, options.token, accounting); }
  catch {
    return normalizeRepositoryEvidence({ repositories: [], coverage: { coverage: "unavailable", eligible: 0, examined: 0, failed: 1, omittedByBudget: 0 }, requests: accounting });
  }
  if (!Array.isArray(listed)) throw new Error("github_v2_repository_list_invalid");
  const summaries: RawRepositoryEvidence[] = listed.filter(isRepo).map((repo) => ({ id: String(repo.id ?? repo.name), name: repo.name!, isFork: Boolean(repo.fork), isArchived: Boolean(repo.archived), isEmpty: (repo.size ?? 0) === 0, stars: repo.stargazers_count ?? 0, pushedAt: repo.pushed_at ?? "1970-01-01T00:00:00Z", languages: {}, files: [] }));
  const selectedNames = new Set(selectRepositories(summaries).selected.map((repo) => repo.name));
  const enriched: RawRepositoryEvidence[] = [];
  for (const summary of summaries) {
    if (!selectedNames.has(summary.name)) { enriched.push(summary); continue; }
    if (accounting.rest >= V2_BALANCE.maxManifestRequests) { failed++; enriched.push(summary); continue; }
    const repoJson = listed.find((item): item is GitHubRepoJson => isRepo(item) && item.name === summary.name)!;
    const branch = repoJson.default_branch ?? "HEAD";
    try {
      const treeRaw = await readJson(fetchImpl, `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(summary.name)}/git/trees/${encodeURIComponent(branch)}?recursive=1`, options.token, accounting);
      accounting.manifestFetches++;
      const tree = treeRaw as GitTreeJson;
      const candidateRank = (path: string): number => /(?:package|composer)\.json$|requirements.*\.txt$|pyproject\.toml$|Gemfile$|pom\.xml$|build\.gradle(?:\.kts)?$|\.csproj$|pubspec\.yaml$/i.test(path) ? 0 : /lock/i.test(path) ? 2 : 1;
      const allCandidates = (tree.tree ?? []).filter((item) => item.type === "blob" && typeof item.path === "string" && typeof item.url === "string" && (item.size ?? 0) <= V2_BALANCE.maxFileBytes && TARGET.test(item.path!) && !IGNORED_PATH.test(item.path!)).sort((a, b) => candidateRank(a.path!) - candidateRank(b.path!) || a.path!.localeCompare(b.path!, "en"));
      const candidates = allCandidates.slice(0, 2);
      omittedFilesByBudget += Math.max(0, allCandidates.length - candidates.length);
      const files: RepositorySourceFile[] = [];
      for (const item of candidates) {
        if (accounting.rest >= V2_BALANCE.maxManifestRequests) break;
        try { files.push({ path: item.path!, content: await fetchBlob(fetchImpl, item.url!, options.token, accounting) }); } catch { failed++; }
      }
      enriched.push({ ...summary, files });
    } catch { failed++; enriched.push(summary); }
  }
  const eligible = summaries.filter((repo) => !repo.isFork && !repo.isArchived && !repo.isEmpty).length;
  const examined = enriched.filter((repo) => selectedNames.has(repo.name)).length;
  const omittedByBudget = Math.max(0, eligible - examined) + omittedFilesByBudget;
  const collection: RawEvidenceCollection = { repositories: enriched, coverage: { coverage: failed > 0 || omittedByBudget > 0 ? "partial" : "full", eligible, examined, failed, omittedByBudget }, requests: { ...accounting, reposInspected: examined } };
  const normalized = normalizeRepositoryEvidence(collection);
  options.cache?.set(cacheKey, normalized);
  return normalized;
}
