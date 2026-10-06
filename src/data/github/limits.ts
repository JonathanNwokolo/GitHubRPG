/**
 * Every tunable of the GitHub integration. Documented in GITHUB_API_INTEGRATION.md.
 * No environment access here: configuration is centralised in datasource/config.ts.
 */

export const GITHUB_API_BASE_URL = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";
export const USER_AGENT = "github-rpg";

/** Per external operation (one HTTP request, body included). */
export const REQUEST_TIMEOUT_MS = 10_000;
/** Retries for transient failures (network error, 502/503/504). Never for timeouts or rate limits. */
export const MAX_TRANSIENT_RETRIES = 1;
export const RETRY_DELAY_MS = 500;

/** Concurrent in-flight requests per data source instance, across all profiles. */
export const MAX_CONCURRENT_REQUESTS = 6;
/** Concurrent `/languages` calls per profile (REST path, and the GraphQL path's per-repository fallback). */
export const LANGUAGE_FETCH_CONCURRENCY = 6;
/** Beyond this many repositories the remaining ones get no language data (coverage becomes partial). */
export const MAX_LANGUAGE_REQUESTS = 150;

export const REPOS_PER_PAGE = 100;
/** 10 pages x 100 = 1000 repositories. Beyond that the repository list is partial. */
export const MAX_REPO_PAGES = 10;

/**
 * GraphQL repository pages (authenticated path). 50 per page because latency grows with the page
 * (measured: 100 repositories with languages ~5.4 s, 50 ~3 s, against a 10 s timeout).
 * 20 pages x 50 = the same 1000-repository ceiling as the REST path.
 */
export const GRAPHQL_REPOS_PER_PAGE = 50;
export const MAX_GRAPHQL_REPO_PAGES = 20;
/** Languages read per repository in the batched query. A repository with more falls back to REST `/languages`. */
export const GRAPHQL_LANGUAGES_PER_REPO = 30;

/** Years bundled in one GraphQL request (aliased `contributionsCollection`s). */
export const CONTRIBUTION_YEARS_PER_REQUEST = 5;
export const CONTRIBUTION_REQUEST_CONCURRENCY = 3;
/** GitHub is older than 2008; this only guards against runaway loops. */
export const MAX_CONTRIBUTION_YEARS = 25;

/** Mirror of the engine's RECENT_WINDOW_DAYS (asserted equal in a test; the data layer does not import the engine). */
export const RECENT_WINDOW_DAYS = 365;

export const CACHE_TTL_MS = 15 * 60 * 1000;
export const NOT_FOUND_TTL_MS = 60 * 1000;
export const CACHE_MAX_ENTRIES = 500;

/** Used when GitHub signals a secondary rate limit without a usable Retry-After. */
export const DEFAULT_RATE_LIMIT_WAIT_SECONDS = 60;
