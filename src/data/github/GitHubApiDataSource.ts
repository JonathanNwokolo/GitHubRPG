import { ProfileNotFoundError, type GitHubDataSource, type GitHubProfileRequestOptions, type RawGitHubData } from "../contracts";
import { assembleRawProfile } from "./assemble";
import { TtlCache } from "./cache";
import { systemClock, type Clock } from "./clock";
import { fetchContributionHistory } from "./contributions";
import { GitHubNotFoundError, GitHubRateLimitError } from "./errors";
import { fetchRepositoryDataGraphQL } from "./graphqlRepositories";
import { GitHubHttpClient, type RequestContext } from "./httpClient";
import { CACHE_MAX_ENTRIES, CACHE_TTL_MS, NOT_FOUND_TTL_MS } from "./limits";
import { fetchRepositoryData, fetchUser } from "./restFetchers";
import { RequestStats, type CacheOutcome, type ProfileFetchReport } from "./stats";
import { parseGitHubUsername, usernameKey } from "./username";
import { getGitHubProjectProtection, GitHubProjectProtection } from "./protection";
import { isVercelRuntime } from "../datasource/config";

export interface GitHubApiDataSourceOptions {
  /** The server-only credential. Optional: without it only the anonymous REST data is available. */
  token?: string;
  fetch?: typeof fetch;
  now?: Clock;
  sleep?: (ms: number) => Promise<void>;
  /** Monotonic milliseconds, for durations only. */
  monotonicNow?: () => number;
  timeoutMs?: number;
  /**
   * How repositories and their languages are read.
   * - "auto" (default): GraphQL when a token is configured (one request per 50 repositories), REST otherwise;
   * - "rest": always REST (one `/languages` request per repository). Same data, many more requests;
   *   kept for anonymous use, comparisons (`github:smoke -- --rest`) and as a documented escape hatch.
   */
  repositoryTransport?: "auto" | "rest";
  maxConcurrentRequests?: number;
  cacheTtlMs?: number;
  notFoundTtlMs?: number;
  maxCacheEntries?: number;
  /** Called after every getProfile (hit or miss) with request counts. Internal instrumentation only. */
  onReport?: (report: ProfileFetchReport) => void;
  projectProtection?: GitHubProjectProtection;
}

const MAX_REPORTS_KEPT = 50;

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Real, public GitHub data. Server-side only (it holds the token).
 *
 *   getProfile -> cache / in-flight dedup -> REST (user) + GraphQL (repositories + languages, contributions)
 *                 (without a token: REST for user, repositories and languages; no contributions)
 *              -> RawGitHubData (same contract as MockDataSource)
 *
 * Validation, normalization and the Game Engine run afterwards, exactly as for the mock.
 */
export class GitHubApiDataSource implements GitHubDataSource {
  readonly kind = "github" as const;

  private readonly client: GitHubHttpClient;
  private readonly now: Clock;
  private readonly monotonicNow: () => number;
  private readonly onReport?: (report: ProfileFetchReport) => void;
  private readonly repositoryTransport: "auto" | "rest";
  private readonly cache: TtlCache<RawGitHubData>;
  private readonly notFound: TtlCache<true>;
  private readonly inflight = new Map<string, Promise<RawGitHubData>>();
  /** Per running fetch: settles when the user lookup (its first request) has answered. See ensureProfileExists. */
  private readonly lookups = new Map<string, Promise<void>>();
  private readonly reports: ProfileFetchReport[] = [];
  private readonly projectProtection: GitHubProjectProtection;

  constructor(options: GitHubApiDataSourceOptions = {}) {
    this.now = options.now ?? systemClock;
    this.monotonicNow = options.monotonicNow ?? (() => performance.now());
    this.onReport = options.onReport;
    this.projectProtection = options.projectProtection
      ?? (isVercelRuntime() ? getGitHubProjectProtection() : new GitHubProjectProtection({ store: null }));
    this.repositoryTransport = options.repositoryTransport ?? "auto";
    this.client = new GitHubHttpClient({
      token: options.token,
      fetch: options.fetch,
      now: this.now,
      sleep: options.sleep,
      timeoutMs: options.timeoutMs,
      maxConcurrent: options.maxConcurrentRequests,
    });
    const nowMs = () => this.now().getTime();
    this.cache = new TtlCache(options.cacheTtlMs ?? CACHE_TTL_MS, options.maxCacheEntries ?? CACHE_MAX_ENTRIES, nowMs);
    this.notFound = new TtlCache(options.notFoundTtlMs ?? NOT_FOUND_TTL_MS, options.maxCacheEntries ?? CACHE_MAX_ENTRIES, nowMs);
  }

  get authenticated(): boolean {
    return this.client.authenticated;
  }

  /** The most recent fetch reports (newest last). */
  getReports(): readonly ProfileFetchReport[] {
    return this.reports;
  }

  /**
   * @throws InvalidUsernameError before any request when the name cannot be a GitHub login;
   * ProfileNotFoundError, GitHubRateLimitError, GitHubUnavailableError, GitHubTimeoutError,
   * GitHubDataValidationError otherwise.
   */
  async getProfile(username: string, options: GitHubProfileRequestOptions = {}): Promise<RawGitHubData> {
    const login = parseGitHubUsername(username);
    const key = usernameKey(login);
    const startedAt = this.monotonicNow();
    const stats = new RequestStats();

    const finish = (cache: CacheOutcome, ok: boolean) =>
      this.report({
        username: key,
        cache,
        restRequests: stats.rest,
        graphqlRequests: stats.graphql,
        totalRequests: stats.total,
        durationMs: Math.round(this.monotonicNow() - startedAt),
        authenticated: this.authenticated,
        ok,
        graphqlByPurpose: stats.graphqlByPurpose,
        ...(stats.phases ? { phases: stats.phases } : {}),
      });

    const cached = this.cache.get(key);
    if (cached) {
      finish("hit", true);
      return cached;
    }
    if (this.notFound.get(key)) {
      finish("not-found-hit", false);
      throw new ProfileNotFoundError(login);
    }

    const running = this.inflight.get(key);
    if (running) {
      try {
        const raw = await running;
        finish("coalesced", true);
        return raw;
      } catch (error) {
        finish("coalesced", false);
        throw error;
      }
    }

    const lookup = deferred();
    lookup.promise.catch(() => {}); // most callers never wait for it: a failure must not look unhandled
    const promise = this.loadProtected(login, stats, lookup, options);
    this.inflight.set(key, promise);
    this.lookups.set(key, lookup.promise);
    try {
      const raw = await promise;
      this.cache.set(key, raw);
      finish("miss", true);
      await Promise.all([
        this.projectProtection.observeSnapshot("rest", this.client.getRateLimit("rest"), options.protection),
        this.projectProtection.observeSnapshot("graphql", this.client.getRateLimit("graphql"), options.protection),
        this.projectProtection.observeSuccess(options.protection),
      ]);
      return raw;
    } catch (error) {
      if (error instanceof ProfileNotFoundError) this.notFound.set(key, true);
      if (error instanceof GitHubRateLimitError) await this.projectProtection.observeRateLimit(error, options.protection);
      else await this.projectProtection.observeProbeFailure(options.protection);
      finish("miss", false);
      throw error;
    } finally {
      this.inflight.delete(key);
      this.lookups.delete(key);
    }
  }

  /**
   * Resolves as soon as GET /users/{login} has confirmed the profile exists. The rest of the fetch keeps
   * running and is shared with a later `getProfile` (same in-flight entry and cache), so this adds no request.
   * Throws exactly what `getProfile` would for an unknown/invalid user, or when the lookup itself fails.
   */
  async ensureProfileExists(username: string, options: GitHubProfileRequestOptions = {}): Promise<void> {
    const login = parseGitHubUsername(username);
    const key = usernameKey(login);

    if (this.cache.get(key)) return;
    if (this.notFound.get(key)) throw new ProfileNotFoundError(login);

    if (!this.lookups.has(key)) {
      // Start the full fetch exactly as getProfile does; only its first step is awaited here.
      this.getProfile(login, options).catch(() => {});
    }
    await this.lookups.get(key);
  }

  private report(report: ProfileFetchReport): void {
    this.reports.push(report);
    if (this.reports.length > MAX_REPORTS_KEPT) this.reports.shift();
    this.onReport?.(report);
  }

  private async loadProtected(
    login: string,
    stats: RequestStats,
    lookup: Deferred,
    options: GitHubProfileRequestOptions
  ): Promise<RawGitHubData> {
    try {
      await this.projectProtection.beforeColdWork(login, options.protection);
      return await this.load(login, stats, lookup);
    } catch (error) {
      lookup.reject(error);
      throw error;
    }
  }

  private async load(login: string, stats: RequestStats, lookup: Deferred): Promise<RawGitHubData> {
    const controller = new AbortController();
    const ctx: RequestContext = { stats, signal: controller.signal };
    try {
      const loadStarted = this.monotonicNow();
      const user = await fetchUser(this.client, login, ctx);
      lookup.resolve();
      const userMs = Math.round(this.monotonicNow() - loadStarted);
      const fetchedAt = this.now();

      // Repositories (+ languages) and contributions are independent: run them side by side.
      const viaGraphQL = this.client.authenticated && this.repositoryTransport === "auto";
      const timed = <T>(task: Promise<T>, record: (ms: number) => void): Promise<T> => {
        const started = this.monotonicNow();
        return task.then((value) => { record(Math.round(this.monotonicNow() - started)); return value; });
      };
      let repositoriesMs = 0;
      let contributionsMs = 0;
      const [repositories, history] = await Promise.all([
        timed(
          viaGraphQL ? fetchRepositoryDataGraphQL(this.client, user, ctx) : fetchRepositoryData(this.client, user, ctx),
          (ms) => { repositoriesMs = ms; }
        ),
        this.client.authenticated
          ? timed(fetchContributionHistory(this.client, user.login, user.created_at, fetchedAt, ctx), (ms) => { contributionsMs = ms; })
          : Promise.resolve(null),
      ]);
      stats.phases = { userMs, repositoriesMs, contributionsMs };

      return assembleRawProfile({ user, repositories, history, fetchedAt });
    } catch (error) {
      controller.abort(); // stop sibling requests that are still queued or in flight
      const failure = error instanceof GitHubNotFoundError ? new ProfileNotFoundError(login) : error;
      lookup.reject(failure); // no-op when the user lookup had already succeeded
      throw failure;
    }
  }
}
