import type { GitHubDataSource } from "../contracts";
import { GitHubApiDataSource } from "../github/GitHubApiDataSource";
import { readDataSourceConfig, type DataSourceConfig, type DataSourceKind } from "./config";
import { MockDataSource } from "./MockDataSource";

/**
 * SERVER-SIDE ONLY. It can build the GitHub source, which holds the token:
 * client components must never import this module (an architecture test enforces it).
 * The browser reaches data through /api/characters/[username].
 */

let singleton: { key: string; source: GitHubDataSource } | null = null;

function describeKey(config: DataSourceConfig): string {
  return `${config.kind}|${config.githubToken ?? ""}|${config.logFetchReports}`;
}

/**
 * The ONLY place that picks a data source.
 * Config comes from GITHUB_DATA_SOURCE (see ./config.ts); the instance is reused so the
 * GitHub source keeps its cache and in-flight dedup between requests.
 */
export function createDataSource(config: DataSourceConfig = readDataSourceConfig()): GitHubDataSource {
  const key = describeKey(config);
  if (singleton?.key === key) return singleton.source;

  const source: GitHubDataSource =
    config.kind === "github"
      ? new GitHubApiDataSource({
          token: config.githubToken,
          onReport: config.logFetchReports
            ? (r) =>
                console.info(
                  `[github] ${r.username} cache=${r.cache} rest=${r.restRequests} graphql=${r.graphqlRequests} ${r.durationMs}ms ${r.ok ? "ok" : "failed"}`
                )
            : undefined,
        })
      : new MockDataSource();
  singleton = { key, source };
  return source;
}

/** The configured kind, or null when the server is misconfigured (never throws: used by layouts). */
export function resolveDataSourceKind(): DataSourceKind | null {
  try {
    return readDataSourceConfig().kind;
  } catch {
    return null;
  }
}

export type { GitHubDataSource, RawGitHubData, DataCoverage } from "../contracts";
export { ProfileNotFoundError } from "../contracts";
export { DataSourceConfigError, readDataSourceConfig } from "./config";
export type { DataSourceConfig, DataSourceKind } from "./config";
