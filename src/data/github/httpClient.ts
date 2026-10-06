import { z } from "zod";
import { createLimiter } from "./concurrency";
import { systemClock, type Clock } from "./clock";
import {
  GitHubDataValidationError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubUnavailableError,
  RequestAbortedError,
  type RateLimitKind,
} from "./errors";
import {
  DEFAULT_RATE_LIMIT_WAIT_SECONDS,
  GITHUB_API_BASE_URL,
  GITHUB_API_VERSION,
  MAX_CONCURRENT_REQUESTS,
  MAX_TRANSIENT_RETRIES,
  REQUEST_TIMEOUT_MS,
  RETRY_DELAY_MS,
  USER_AGENT,
} from "./limits";
import type { RequestStats } from "./stats";

export type RequestKind = "rest" | "graphql";

/** Per profile fetch: where requests are counted and how they are cancelled. */
export interface RequestContext {
  stats: RequestStats;
  signal?: AbortSignal;
}

export interface RateLimitSnapshot {
  limit: number | null;
  remaining: number | null;
  resetAt: Date | null;
}

export interface GitHubHttpClientOptions {
  /** Server-only credential. Used for the Authorization header and nowhere else. */
  token?: string;
  fetch?: typeof fetch;
  now?: Clock;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  maxConcurrent?: number;
  retryDelayMs?: number;
}

/** The ONE place request headers are built. */
export function buildHeaders(token: string | undefined, hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": USER_AGENT,
  };
  if (hasBody) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const graphqlEnvelope = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.object({ type: z.string().optional(), message: z.string().optional() })).optional(),
});

function headerNumber(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function messageOf(body: unknown): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

function isTransient(error: unknown): boolean {
  return (
    error instanceof GitHubUnavailableError &&
    (error.reason === "network" || (error.status !== null && TRANSIENT_STATUSES.has(error.status)))
  );
}

/**
 * Low-level, server-side GitHub transport: headers, timeout, bounded concurrency,
 * rate-limit detection (with a fail-fast gate), one retry for transient failures.
 * It never logs and never puts headers or bodies into errors.
 */
export class GitHubHttpClient {
  private readonly token: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly now: Clock;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly timeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly limit: ReturnType<typeof createLimiter>;

  private readonly blocked = new Map<RequestKind, { until: number; error: GitHubRateLimitError }>();
  private readonly snapshots: Record<RequestKind, RateLimitSnapshot> = {
    rest: { limit: null, remaining: null, resetAt: null },
    graphql: { limit: null, remaining: null, resetAt: null },
  };

  constructor(options: GitHubHttpClientOptions = {}) {
    this.token = options.token?.trim() || undefined;
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? systemClock;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
    this.retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
    this.limit = createLimiter(options.maxConcurrent ?? MAX_CONCURRENT_REQUESTS);
  }

  get authenticated(): boolean {
    return this.token !== undefined;
  }

  /** Last rate-limit headers seen (safe to expose: numbers and a date only). */
  getRateLimit(kind: RequestKind): RateLimitSnapshot {
    return { ...this.snapshots[kind] };
  }

  async rest(
    path: string,
    query: Record<string, string | number> | undefined,
    ctx: RequestContext
  ): Promise<{ data: unknown; link: string | null }> {
    const url = new URL(path, GITHUB_API_BASE_URL);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
    const { body, headers } = await this.execute(
      "rest",
      url.toString(),
      { method: "GET", headers: buildHeaders(this.token, false) },
      ctx
    );
    return { data: body, link: headers.get("link") };
  }

  /** GraphQL needs a token. Returns `data`; GraphQL-level errors are translated to typed errors. */
  async graphql(query: string, variables: Record<string, unknown>, ctx: RequestContext): Promise<unknown> {
    if (!this.token) throw new GitHubUnavailableError("auth");
    const { body } = await this.execute(
      "graphql",
      `${GITHUB_API_BASE_URL}/graphql`,
      { method: "POST", headers: buildHeaders(this.token, true), body: JSON.stringify({ query, variables }) },
      ctx
    );

    const envelope = graphqlEnvelope.safeParse(body);
    if (!envelope.success) throw new GitHubDataValidationError("graphql envelope");
    const { data, errors } = envelope.data;

    if (errors && errors.length > 0) {
      if (errors.some((e) => e.type === "RATE_LIMITED")) {
        const snapshot = this.snapshots.graphql;
        throw this.blockRateLimit("graphql", "primary", snapshot.resetAt, snapshot.remaining ?? 0);
      }
      if (errors.every((e) => e.type === "NOT_FOUND")) throw new GitHubNotFoundError();
      throw new GitHubUnavailableError("upstream");
    }
    if (data === undefined || data === null) throw new GitHubDataValidationError("graphql data");
    return data;
  }

  private async execute(
    kind: RequestKind,
    url: string,
    init: RequestInit,
    ctx: RequestContext
  ): Promise<{ body: unknown; headers: Headers }> {
    for (let attempt = 0; ; attempt++) {
      this.assertNotBlocked(kind);
      if (ctx.signal?.aborted) throw new RequestAbortedError();
      try {
        return await this.limit(() => this.attempt(kind, url, init, ctx));
      } catch (error) {
        if (!isTransient(error) || attempt >= MAX_TRANSIENT_RETRIES) throw error;
        await this.sleep(this.retryDelayMs);
      }
    }
  }

  private async attempt(
    kind: RequestKind,
    url: string,
    init: RequestInit,
    ctx: RequestContext
  ): Promise<{ body: unknown; headers: Headers }> {
    // Re-checked here: this task may have waited in the concurrency queue.
    if (ctx.signal?.aborted) throw new RequestAbortedError();
    this.assertNotBlocked(kind);

    if (kind === "rest") ctx.stats.rest++;
    else ctx.stats.graphql++;

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const onParentAbort = () => controller.abort();
    ctx.signal?.addEventListener("abort", onParentAbort, { once: true });

    let response: Response;
    let text: string;
    try {
      response = await this.fetchImpl(url, { ...init, signal: controller.signal, cache: "no-store" });
      text = await response.text();
    } catch {
      if (timedOut) throw new GitHubTimeoutError(this.timeoutMs);
      if (ctx.signal?.aborted) throw new RequestAbortedError();
      throw new GitHubUnavailableError("network");
    } finally {
      clearTimeout(timer);
      ctx.signal?.removeEventListener("abort", onParentAbort);
    }

    this.recordRateLimit(kind, response.headers);

    if (response.ok) {
      const body = parseJson(text);
      if (body === undefined) throw new GitHubDataValidationError("response was not valid JSON");
      return { body, headers: response.headers };
    }
    throw this.classifyFailure(kind, response, parseJson(text));
  }

  private classifyFailure(kind: RequestKind, response: Response, body: unknown): Error {
    const { status, headers } = response;

    if (status === 404) return new GitHubNotFoundError();
    if (status === 401) return new GitHubUnavailableError("auth", status);

    if (status === 403 || status === 429) {
      const remaining = headerNumber(headers, "x-ratelimit-remaining");
      const retryAfter = headerNumber(headers, "retry-after");
      const text = messageOf(body);
      const resetEpoch = headerNumber(headers, "x-ratelimit-reset");
      const resetAt = resetEpoch === null ? null : new Date(resetEpoch * 1000);

      if (remaining === 0) return this.blockRateLimit(kind, "primary", resetAt, 0);
      if (retryAfter !== null || status === 429 || /secondary rate limit|abuse detection/i.test(text)) {
        const wait = retryAfter ?? DEFAULT_RATE_LIMIT_WAIT_SECONDS;
        return this.blockRateLimit(kind, "secondary", new Date(this.now().getTime() + wait * 1000), remaining);
      }
      return new GitHubUnavailableError("forbidden", status);
    }

    return new GitHubUnavailableError("upstream", status);
  }

  private recordRateLimit(kind: RequestKind, headers: Headers): void {
    const limit = headerNumber(headers, "x-ratelimit-limit");
    const remaining = headerNumber(headers, "x-ratelimit-remaining");
    const resetEpoch = headerNumber(headers, "x-ratelimit-reset");
    if (limit === null && remaining === null && resetEpoch === null) return;

    const resetAt = resetEpoch === null ? null : new Date(resetEpoch * 1000);
    this.snapshots[kind] = { limit, remaining, resetAt };
    // Budget exhausted: stop sending requests that would only be refused.
    if (remaining === 0 && resetAt) this.blockRateLimit(kind, "primary", resetAt, 0);
  }

  private blockRateLimit(
    kind: RequestKind,
    limitKind: RateLimitKind,
    resetAt: Date | null,
    remaining: number | null
  ): GitHubRateLimitError {
    const until = resetAt?.getTime() ?? this.now().getTime() + DEFAULT_RATE_LIMIT_WAIT_SECONDS * 1000;
    const error = new GitHubRateLimitError(limitKind, resetAt ?? new Date(until), remaining);
    this.blocked.set(kind, { until, error });
    return error;
  }

  private assertNotBlocked(kind: RequestKind): void {
    const block = this.blocked.get(kind);
    if (!block) return;
    if (block.until > this.now().getTime()) throw block.error;
    this.blocked.delete(kind);
  }
}
