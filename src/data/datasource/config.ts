/**
 * The ONLY file in src/ that reads process.env (architecture tests enforce it, and that
 * GITHUB_TOKEN is not mentioned anywhere else). Server-side only: never import this from a client component.
 *
 *   GITHUB_DATA_SOURCE = mock | github
 *     development / test, unset -> mock (safe default)
 *     production, unset         -> error: production must choose explicitly
 *   GITHUB_TOKEN (optional, server-only)
 *     read only when the source is "github".
 *   UPSTASH_REDIS_REST_URL / _TOKEN, USAGE_COUNTER_ENABLED (optional, server-only)
 *     see readUsageCounterConfig.
 */

export type DataSourceKind = "mock" | "github";

export interface DataSourceConfig {
  kind: DataSourceKind;
  /** Present only for kind "github" and only when GITHUB_TOKEN is set. */
  githubToken?: string;
  /** Log one line per profile fetch (request counts, cache outcome). Development only. */
  logFetchReports: boolean;
}

export interface GameEngineV2UiConfig {
  enabled: boolean;
  /** Empty means every valid profile is eligible once the main flag is enabled. */
  allowlist: ReadonlySet<string>;
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

/** Server-only, fail-closed product rollout switch. */
export function readGameEngineV2UiConfig(env: Env = process.env): GameEngineV2UiConfig {
  const enabled = ["1", "true", "yes", "on"].includes(env.GAME_ENGINE_V2_UI_ENABLED?.trim().toLowerCase() ?? "");
  const allowlist = new Set(
    (env.GAME_ENGINE_V2_UI_ALLOWLIST ?? "")
      .split(",")
      .map((username) => username.trim().toLowerCase())
      .filter(Boolean)
  );
  return { enabled, allowlist };
}

export function isGameEngineV2UiEnabled(username: string, env: Env = process.env): boolean {
  const config = readGameEngineV2UiConfig(env);
  return config.enabled && (config.allowlist.size === 0 || config.allowlist.has(username.trim().toLowerCase()));
}

/** Test-only cold-path seam. Callers must still restrict it to the mock data source. */
export function isGameEngineV2E2EColdProfile(username: string, env: Env = process.env): boolean {
  return env.GAME_ENGINE_V2_E2E_COLD_USERNAME?.trim().toLowerCase() === username.trim().toLowerCase();
}

export interface UsageCounterConfig {
  /** True only for real production traffic on the GitHub source, with the store configured and the switch on. */
  enabled: boolean;
  /** Upstash REST endpoint and token (server-only). Present only when `enabled`. */
  restUrl?: string;
  restToken?: string;
}

const DISABLED_USAGE_COUNTER: UsageCounterConfig = { enabled: false };

/**
 * Global "unique profiles summoned" counter (Upstash Redis over REST).
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (the Vercel Marketplace also provides
 *   KV_REST_API_URL / KV_REST_API_TOKEN, accepted as equivalents; never the read-only token)
 *   USAGE_COUNTER_ENABLED=false                          kill switch (default: on when the store is configured)
 * It never counts mock, development or preview traffic. Fail-closed: any problem means "disabled".
 */
export function readUsageCounterConfig(env: Env = process.env): UsageCounterConfig {
  if (["0", "false", "no", "off"].includes(env.USAGE_COUNTER_ENABLED?.trim().toLowerCase() ?? "")) {
    return DISABLED_USAGE_COUNTER;
  }

  const restUrl = (env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL)?.trim();
  const restToken = (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN)?.trim();
  if (!restUrl || !restToken) return DISABLED_USAGE_COUNTER;

  let kind: DataSourceKind;
  try {
    kind = readDataSourceConfig(env).kind;
  } catch {
    return DISABLED_USAGE_COUNTER;
  }

  const realProduction = kind === "github" && getVercelEnvironment(env) === "production";
  // Test-only seam: lets the e2e suite exercise the counter against a fake store on the mock source.
  // Never effective on Vercel, so it cannot count (or be abused to count) real traffic.
  const e2eFakeStore = env.USAGE_COUNTER_E2E === "1" && kind === "mock" && !isVercelRuntime(env);
  if (!realProduction && !e2eFakeStore) return DISABLED_USAGE_COUNTER;

  try {
    const url = new URL(restUrl);
    const secure = url.protocol === "https:" || (e2eFakeStore && url.protocol === "http:");
    if (!secure) return DISABLED_USAGE_COUNTER;
  } catch {
    return DISABLED_USAGE_COUNTER;
  }
  return { enabled: true, restUrl, restToken };
}

/** Runtime/platform signal only; kept here so environment access stays at the server config boundary. */
export function isVercelRuntime(env: Env = process.env): boolean {
  return Boolean(env.VERCEL);
}

/** Stable cache partition; never includes a secret or a user-controlled request value. */
export function getVercelEnvironment(env: Env = process.env): "production" | "preview" | "development" | "local" {
  const value = env.VERCEL_ENV?.trim().toLowerCase();
  return value === "production" || value === "preview" || value === "development" ? value : "local";
}
