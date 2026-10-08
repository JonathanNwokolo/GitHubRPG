import type { RawRepository } from "../contracts";
import { createLimiter, mapWithConcurrency } from "./concurrency";
import { graphqlCursorsSchema, graphqlRepositoriesSchema, parsePayload, type GraphqlCursorConnection, type GraphqlRepositoryNode, type RestUser } from "./apiSchemas";
import { RequestAbortedError } from "./errors";
import type { GitHubHttpClient, RequestContext } from "./httpClient";
import {
  GRAPHQL_CURSOR_PAGE_SIZE,
  GRAPHQL_LANGUAGES_PER_REPO,
  GRAPHQL_PIPELINE_MIN_REPOS,
  GRAPHQL_REPO_PAGE_CONCURRENCY,
  GRAPHQL_REPOS_PER_PAGE,
  LANGUAGE_FETCH_CONCURRENCY,
  MAX_GRAPHQL_REPO_PAGES,
  MAX_LANGUAGE_REQUESTS,
} from "./limits";
import { fetchRepositoryLanguages, type RepositoryData } from "./restFetchers";

/**
 * Owned public repositories, newest push first (same set and order as REST `type=owner&sort=pushed`),
 * each with its languages in bytes: `languages.edges[].size` is the number `/languages` returns.
 * `totalCount` lets us detect a repository with more languages than `$langs` (see below).
 * All values are variables: nothing user-controlled is interpolated into the query.
 */
export const REPOSITORIES_QUERY = `query ($login: String!, $first: Int!, $after: String, $langs: Int!) {
  user(login: $login) {
    repositories(first: $first, after: $after, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: PUSHED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        databaseId
        name
        isFork
        isArchived
        isEmpty
        pushedAt
        diskUsage
        primaryLanguage { name }
        stargazerCount
        forkCount
        languages(first: $langs, orderBy: {field: SIZE, direction: DESC}) { totalCount edges { size node { name } } }
      }
    }
  }
}`;

/**
 * Same connection, same order, same filters as REPOSITORIES_QUERY, but only the position of each repository:
 * `edges[i].cursor` is the cursor that makes the next page start right after repository i.
 */
export const REPOSITORY_CURSORS_QUERY = `query ($login: String!, $first: Int!, $after: String) {
  user(login: $login) {
    repositories(first: $first, after: $after, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: PUSHED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      edges { cursor }
    }
  }
}`;

function languagesOf(node: GraphqlRepositoryNode): Record<string, number> {
  const bytes: Record<string, number> = {};
  for (const edge of node.languages?.edges ?? []) bytes[edge.node.name] = (bytes[edge.node.name] ?? 0) + edge.size;
  return bytes;
}

/** The batched query could not return every language of this repository: ask `/languages` for it instead. */
function needsRestFallback(node: GraphqlRepositoryNode): boolean {
  return node.languages === null || node.languages.totalCount > node.languages.edges.length;
}

type RepositoriesConnection = ReturnType<typeof parseRepositoriesPage>;

function parseRepositoriesPage(data: unknown) {
  return parsePayload(graphqlRepositoriesSchema, data, "repositories").user.repositories;
}

function fetchRepositoriesPage(client: GitHubHttpClient, login: string, after: string | null, ctx: RequestContext) {
  return client
    .graphql(REPOSITORIES_QUERY, { login, first: GRAPHQL_REPOS_PER_PAGE, after, langs: GRAPHQL_LANGUAGES_PER_REPO }, ctx, "repositories")
    .then(parseRepositoriesPage);
}

/** Pages in list order, one request after the other: each cursor comes from the page before. */
async function fetchRepositoryPagesSequentially(
  client: GitHubHttpClient,
  user: RestUser,
  ctx: RequestContext
): Promise<RepositoriesConnection[]> {
  const pages: RepositoriesConnection[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_GRAPHQL_REPO_PAGES; page++) {
    const connection = await fetchRepositoriesPage(client, user.login, cursor, ctx);
    pages.push(connection);
    const { hasNextPage, endCursor } = connection.pageInfo;
    if (!hasNextPage || endCursor === null || connection.nodes.length === 0) break;
    cursor = endCursor;
  }
  return pages;
}

/**
 * The same pages as the sequential chain (same query, same 50 repositories, same order, same page limit), without
 * waiting for each page to finish before asking for the next:
 *
 * 1. a walk of `edges { cursor }` (100 repositories per call, one call after the other) learns where every page
 *    starts: page h begins after the cursor of repository 50h - 1;
 * 2. each full page is requested as soon as its cursor is known, GRAPHQL_REPO_PAGE_CONCURRENCY at a time;
 * 3. the first page needs no cursor and starts at once.
 *
 * The walk stops once the cursor of the last allowed page is known. Any failure rejects immediately (the caller
 * aborts the sibling requests). Every request still goes through the client: limiter, rate-limit gate, retry.
 */
async function fetchRepositoryPagesPipelined(
  client: GitHubHttpClient,
  user: RestUser,
  ctx: RequestContext
): Promise<RepositoriesConnection[]> {
  const limit = createLimiter(GRAPHQL_REPO_PAGE_CONCURRENCY);
  const cursors: string[] = [];
  const pages: Array<Promise<RepositoriesConnection>> = [];
  let failed = false;
  let fail!: (reason: unknown) => void;
  const failure = new Promise<never>((_, reject) => { fail = reject; });
  failure.catch(() => {});

  const startPage = (index: number) => {
    const after = index === 0 ? null : cursors[index * GRAPHQL_REPOS_PER_PAGE - 1];
    const page = limit(() => (failed ? Promise.reject(new RequestAbortedError()) : fetchRepositoriesPage(client, user.login, after, ctx)));
    page.catch((error) => { failed = true; fail(error); });
    pages[index] = page;
  };
  // Page h exists when repository 50h exists: it is already listed, or the walk is over and it is not.
  const startReadyPages = () => {
    while (pages.length < MAX_GRAPHQL_REPO_PAGES && cursors.length > pages.length * GRAPHQL_REPOS_PER_PAGE) startPage(pages.length);
  };
  const lastCursorNeeded = (MAX_GRAPHQL_REPO_PAGES - 1) * GRAPHQL_REPOS_PER_PAGE + 1;
  const fetchCursors = (after: string | null): Promise<GraphqlCursorConnection> => {
    const request = client
      .graphql(REPOSITORY_CURSORS_QUERY, { login: user.login, first: GRAPHQL_CURSOR_PAGE_SIZE, after }, ctx, "repository_cursors")
      .then((data) => parsePayload(graphqlCursorsSchema, data, "repository cursors").user.repositories);
    request.catch(() => {}); // the walk may stop (failure elsewhere) before it awaits this one
    return request;
  };

  startPage(0);
  const walk = (async () => {
    let request: Promise<GraphqlCursorConnection> | null = fetchCursors(null);
    while (request && !failed) {
      const connection: GraphqlCursorConnection = await request;
      for (const edge of connection.edges) cursors.push(edge.cursor);
      const { hasNextPage, endCursor } = connection.pageInfo;
      const more = hasNextPage && endCursor !== null && connection.edges.length > 0 && cursors.length < lastCursorNeeded;
      // The next walk call is queued before the pages it unlocks: the critical path never waits behind them.
      request = more ? fetchCursors(endCursor) : null;
      startReadyPages();
    }
  })();
  walk.catch((error) => { failed = true; fail(error); });

  await Promise.race([walk, failure]);
  return Promise.race([Promise.all(pages), failure]);
}

/**
 * Repositories + languages through GraphQL: one request per 50 repositories instead of one per repository.
 * Same RepositoryData as the REST path, same coverage rules:
 * - coverage: partial when the list is truncated (page safety limit) or shorter than the profile's public_repos;
 * - languagesCoverage: partial when some own repository's languages could not be read.
 *
 * Hybrid fallback (deterministic): only a non-fork repository whose languages came back null or truncated
 * (more than GRAPHQL_LANGUAGES_PER_REPO languages) is read through REST `/languages`, in list order
 * (most recently pushed first), at most MAX_LANGUAGE_REQUESTS of them. Any left out or unreadable => partial.
 * Forks get no languages, exactly like the REST path (every derived number excludes them).
 */
export async function fetchRepositoryDataGraphQL(
  client: GitHubHttpClient,
  user: RestUser,
  ctx: RequestContext
): Promise<RepositoryData> {
  const pages = user.public_repos > GRAPHQL_PIPELINE_MIN_REPOS
    ? await fetchRepositoryPagesPipelined(client, user, ctx)
    : await fetchRepositoryPagesSequentially(client, user, ctx);

  const nodes: GraphqlRepositoryNode[] = [];
  const seen = new Set<string>();
  let truncated = true; // stays true unless a page says there is no next one
  for (const connection of pages) {
    // A push between two pages can shift the cursor: never count a repository twice.
    for (const node of connection.nodes) {
      if (seen.has(node.name)) continue;
      seen.add(node.name);
      nodes.push(node);
    }
    const { hasNextPage, endCursor } = connection.pageInfo;
    if (!hasNextPage) {
      truncated = false;
      break;
    }
    if (endCursor === null || connection.nodes.length === 0) break; // cannot continue: never pretend the list is complete
  }

  const coverage = truncated || nodes.length < user.public_repos ? "partial" : "full";

  const languagesByRepo = new Map<string, Record<string, number>>();
  const fallbacks: GraphqlRepositoryNode[] = [];
  for (const node of nodes) {
    if (node.isFork) continue;
    if (needsRestFallback(node)) fallbacks.push(node);
    else languagesByRepo.set(node.name, languagesOf(node));
  }

  const targets = fallbacks.slice(0, MAX_LANGUAGE_REQUESTS);
  let languagesPartial = fallbacks.length > targets.length;
  await mapWithConcurrency(targets, LANGUAGE_FETCH_CONCURRENCY, async (node) => {
    const languages = await fetchRepositoryLanguages(client, user.login, node.name, ctx);
    if (languages === null) languagesPartial = true;
    else languagesByRepo.set(node.name, languages);
  });

  const items: RawRepository[] = nodes.map((node) => ({
    name: node.name,
    isFork: node.isFork,
    stars: node.stargazerCount,
    forks: node.forkCount,
    languages: languagesByRepo.get(node.name) ?? {},
    ...(node.pushedAt ? { discovery: {
      id: String(node.databaseId ?? node.name),
      isArchived: node.isArchived ?? false,
      isEmpty: node.isEmpty ?? false,
      pushedAt: node.pushedAt,
      // Git Trees accepts HEAD and resolves it to the repository's default branch. Avoiding
      // defaultBranchRef removes one nested GraphQL resolver per repository on large profiles.
      defaultBranch: "HEAD",
      size: node.diskUsage ?? 0,
      primaryLanguage: node.primaryLanguage?.name ?? null,
    } } : {}),
  }));
  return { items, coverage, languagesCoverage: languagesPartial ? "partial" : "full" };
}
