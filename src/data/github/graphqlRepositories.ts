import type { RawRepository } from "../contracts";
import { mapWithConcurrency } from "./concurrency";
import { graphqlRepositoriesSchema, parsePayload, type GraphqlRepositoryNode, type RestUser } from "./apiSchemas";
import type { GitHubHttpClient, RequestContext } from "./httpClient";
import {
  GRAPHQL_LANGUAGES_PER_REPO,
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
        name
        isFork
        stargazerCount
        forkCount
        languages(first: $langs, orderBy: {field: SIZE, direction: DESC}) { totalCount edges { size node { name } } }
      }
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
  const nodes: GraphqlRepositoryNode[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  let truncated = false;

  for (let page = 0; ; page++) {
    if (page >= MAX_GRAPHQL_REPO_PAGES) {
      truncated = true;
      break;
    }
    const data = await client.graphql(
      REPOSITORIES_QUERY,
      { login: user.login, first: GRAPHQL_REPOS_PER_PAGE, after: cursor, langs: GRAPHQL_LANGUAGES_PER_REPO },
      ctx
    );
    const connection = parsePayload(graphqlRepositoriesSchema, data, "repositories").user.repositories;
    // A push between two pages can shift the cursor: never count a repository twice.
    for (const node of connection.nodes) {
      if (seen.has(node.name)) continue;
      seen.add(node.name);
      nodes.push(node);
    }
    const { hasNextPage, endCursor } = connection.pageInfo;
    if (!hasNextPage) break;
    if (endCursor === null || connection.nodes.length === 0) {
      truncated = true; // cannot continue: never pretend the list is complete
      break;
    }
    cursor = endCursor;
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
  }));
  return { items, coverage, languagesCoverage: languagesPartial ? "partial" : "full" };
}
