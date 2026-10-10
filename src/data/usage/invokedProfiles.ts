import { createHash } from "node:crypto";
import { readUsageCounterConfig, type UsageCounterConfig } from "@/data/datasource/config";

/**
 * SERVER-SIDE ONLY. Global, permanent "unique profiles summoned" counter.
 *
 * The only state is one Redis Set of profile identifiers (SHA-256 of the lowercase username, truncated to 128 bits):
 *   SADD  -> 1 when the profile is new, 0 when it was already there (this is the whole dedupe)
 *   SCARD -> the public total
 * No TTL, no visitor data, no username in clear text. Redis is reached over Upstash REST with fetch.
 * Everything here is best effort: a failing or missing store yields `false` / `null`, never an exception.
 */

export const INVOKED_PROFILES_KEY = "ghrpg:v1:invoked-profiles";
/** The counter must never hold a sheet hostage: a slow store is treated as an unavailable one. */
export const USAGE_COUNTER_TIMEOUT_MS = 1_500;
/** Per-instance memo of ids already stored, only to skip a redundant SADD; it is never the source of truth. */
const MEMO_LIMIT = 5_000;
const processMemo = new Set<string>();

export interface UsageCounterDeps {
  config?: UsageCounterConfig;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Same username (any casing) -> same id. 32 hex chars = 128 bits: no practical collisions. */
export function invokedProfileId(username: string): string {
  return createHash("sha256").update(username.trim().toLowerCase()).digest("hex").slice(0, 32);
}

async function redisCommand(command: readonly string[], deps: UsageCounterDeps): Promise<unknown> {
  const config = deps.config ?? readUsageCounterConfig();
  if (!config.enabled || !config.restUrl || !config.restToken) throw new Error("usage_counter_disabled");

  const response = await (deps.fetch ?? fetch)(config.restUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.restToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(deps.timeoutMs ?? USAGE_COUNTER_TIMEOUT_MS),
  });
  const body = (await response.json()) as { result?: unknown; error?: unknown };
  if (!response.ok || body.error !== undefined || body.result === undefined) throw new Error("usage_counter_store_error");
  return body.result;
}

/**
 * Registers a summoned profile. Resolves to true only when it was new. Never rejects.
 * `knownIds` exists so tests (and "another instance") can run without the shared process memo.
 */
export async function recordInvokedProfile(
  username: string,
  deps: UsageCounterDeps & { knownIds?: Set<string> } = {}
): Promise<boolean> {
  const memo = deps.knownIds ?? processMemo;
  try {
    const id = invokedProfileId(username);
    if (memo.has(id)) return false;
    const added = await redisCommand(["SADD", INVOKED_PROFILES_KEY, id], deps);
    if (added !== 0 && added !== 1) return false;
    if (memo.size >= MEMO_LIMIT) memo.clear();
    memo.add(id);
    return added === 1;
  } catch {
    return false;
  }
}

/** The public total (SCARD), or null when the store is disabled, unreachable or answers nonsense. Never rejects. */
export async function readInvokedProfileCount(deps: UsageCounterDeps = {}): Promise<number | null> {
  try {
    const total = await redisCommand(["SCARD", INVOKED_PROFILES_KEY], deps);
    return typeof total === "number" && Number.isSafeInteger(total) && total >= 0 ? total : null;
  } catch {
    return null;
  }
}
