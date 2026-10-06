import { ProfileNotFoundError, type DataCoverage, type RawRepository } from "../contracts";
import { mapWithConcurrency } from "./concurrency";
import { GitHubNotFoundError, GitHubUnavailableError } from "./errors";
import {
  parsePayload,
  restLanguagesSchema,
  restRepoListSchema,
  restUserSchema,
  type RestRepo,
  type RestUser,
} from "./apiSchemas";
import type { GitHubHttpClient, RequestContext } from "./httpClient";
import { LANGUAGE_FETCH_CONCURRENCY, MAX_LANGUAGE_REQUESTS, MAX_REPO_PAGES, REPOS_PER_PAGE } from "./limits";
import { fetchAllPages, hasNextPage } from "./pagination";

/** GET /users/{login}. 404, organizations and bots are all "no such adventurer". */
export async function fetchUser(client: GitHubHttpClient, login: string, ctx: RequestContext): Promise<RestUser> {
  let data: unknown;
  try {
    ({ data } = await client.rest(`/users/${encodeURIComponent(login)}`, undefined, ctx));
  } catch (error) {
    if (error instanceof GitHubNotFoundError) throw new ProfileNotFoundError(login);
    throw error;
  }
  const user = parsePayload(restUserSchema, data, "user");
  if (user.type !== "User") throw new ProfileNotFoundError(login);
  return user;
}

/** GET /users/{login}/repos?type=owner, every page up to MAX_REPO_PAGES. Forks are included and flagged. */
export async function fetchOwnedRepositories(
  client: GitHubHttpClient,
  login: string,
  ctx: RequestContext
): Promise<{ repos: RestRepo[]; truncated: boolean }> {
  const { items, truncated } = await fetchAllPages(async (page) => {
    const { data, link } = await client.rest(
      `/users/${encodeURIComponent(login)}/repos`,
      { type: "owner", sort: "pushed", direction: "desc", per_page: REPOS_PER_PAGE, page },
      ctx
    );
    const repos = parsePayload(restRepoListSchema, data, "repositories");
    return { items: repos, hasNext: hasNextPage(link, repos.length, REPOS_PER_PAGE) };
  }, MAX_REPO_PAGES);
  return { repos: items, truncated };
}

/** GET /repos/{owner}/{repo}/languages. null = this repository has no readable languages (gone, blocked, conflict). */
export async function fetchRepositoryLanguages(
  client: GitHubHttpClient,
  owner: string,
  repo: string,
  ctx: RequestContext
): Promise<Record<string, number> | null> {
  try {
    const { data } = await client.rest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
      undefined,
      ctx
    );
    return parsePayload(restLanguagesSchema, data, "languages");
  } catch (error) {
    if (error instanceof GitHubNotFoundError) return null;
    if (error instanceof GitHubUnavailableError && (error.status === 409 || error.status === 451)) return null;
    throw error;
  }
}

export interface RepositoryData {
  items: RawRepository[];
  coverage: DataCoverage;
  languagesCoverage: DataCoverage;
}

/**
 * Repositories + their languages.
 * - coverage: partial when the list is truncated or shorter than the profile's public_repos;
 * - languagesCoverage: partial when some own repository's languages could not be read
 *   (cap reached, or a repository that answered 404/409/451).
 * Forks never get a languages request: they are excluded from every derived number anyway.
 * Empty-looking repositories (size 0) DO get one: REST `size` lags behind a fresh push (a repository created
 * and pushed today reads 0 while /languages already answers), so skipping them silently lost real languages.
 */
export async function fetchRepositoryData(
  client: GitHubHttpClient,
  user: RestUser,
  ctx: RequestContext
): Promise<RepositoryData> {
  const { repos, truncated } = await fetchOwnedRepositories(client, user.login, ctx);
  const coverage: DataCoverage = truncated || repos.length < user.public_repos ? "partial" : "full";

  const candidates = repos.filter((repo) => !repo.fork);
  const targets = candidates.slice(0, MAX_LANGUAGE_REQUESTS);
  let languagesPartial = candidates.length > targets.length;

  const languagesByRepo = new Map<string, Record<string, number>>();
  await mapWithConcurrency(targets, LANGUAGE_FETCH_CONCURRENCY, async (repo) => {
    const languages = await fetchRepositoryLanguages(client, repo.owner.login, repo.name, ctx);
    if (languages === null) languagesPartial = true;
    else languagesByRepo.set(repo.name, languages);
  });

  return {
    items: repos.map((repo) => ({
      name: repo.name,
      isFork: repo.fork,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      languages: languagesByRepo.get(repo.name) ?? {},
    })),
    coverage,
    languagesCoverage: languagesPartial ? "partial" : "full",
  };
}
