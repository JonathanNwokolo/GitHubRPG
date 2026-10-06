/**
 * The ONLY file in src/ that reads process.env (architecture tests enforce it, and that
 * GITHUB_TOKEN is not mentioned anywhere else). Server-side only: never import this from a client component.
 *
 *   GITHUB_DATA_SOURCE = mock | github
 *     development / test, unset -> mock (safe default)
 *     production, unset         -> error: production must choose explicitly
 *   GITHUB_TOKEN (optional, server-only)
 *     read only when the source is "github".
 */

export type DataSourceKind = "mock" | "github";

export interface DataSourceConfig {
  kind: DataSourceKind;
  /** Present only for kind "github" and only when GITHUB_TOKEN is set. */
  githubToken?: string;
  /** Log one line per profile fetch (request counts, cache outcome). Development only. */
  logFetchReports: boolean;
}

export class DataSourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSourceConfigError";
  }
}

type Env = Record<string, string | undefined>;

export function readDataSourceConfig(env: Env = process.env): DataSourceConfig {
  const requested = env.GITHUB_DATA_SOURCE?.trim().toLowerCase();
  const production = env.NODE_ENV === "production";

  let kind: DataSourceKind;
  if (requested === "mock" || requested === "github") {
    kind = requested;
  } else if (requested === undefined || requested === "") {
    if (production) {
      throw new DataSourceConfigError("GITHUB_DATA_SOURCE must be set to 'mock' or 'github' in production.");
    }
    kind = "mock";
  } else {
    throw new DataSourceConfigError("GITHUB_DATA_SOURCE must be 'mock' or 'github'.");
  }

  const token = env.GITHUB_TOKEN?.trim();
  return {
    kind,
    githubToken: kind === "github" && token ? token : undefined,
    logFetchReports: env.NODE_ENV === "development",
  };
}
