import type { GitHubDataSource } from "../contracts";
import { MockDataSource } from "./MockDataSource";

let singleton: GitHubDataSource | null = null;

/**
 * The ONLY place that picks a data source. The UI never imports MockDataSource.
 * Current phase: MockDataSource.
 * Next phase: return a GitHubApiDataSource here (nothing else changes).
 */
export function createDataSource(): GitHubDataSource {
  if (!singleton) singleton = new MockDataSource();
  return singleton;
}

export type { GitHubDataSource, RawGitHubData, DataCoverage } from "../contracts";
export { ProfileNotFoundError } from "../contracts";
