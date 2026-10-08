import { createHash, randomUUID } from "node:crypto";
import { getCache } from "@vercel/functions";
import type { GitHubRequestProtectionContext } from "../contracts";
import { GitHubRateLimitError, ProjectBudgetDeniedError, type RateLimitKind } from "./errors";
import type { RateLimitSnapshot, RequestKind } from "./httpClient";
import { emitV2Telemetry } from "@/game-v2/telemetry";
import { getVercelEnvironment, isVercelRuntime } from "../datasource/config";

export const CLIENT_RATE_WINDOW_MS = 60_000;
export const CLIENT_RATE_MAX_UNIQUE_COLD_USERNAMES = 30;
export const CLIENT_RATE_MAX_COLD_WORK = 120;
export const PROJECT_RATE_RESERVE: Readonly<Record<RequestKind, number>> = { rest: 100, graphql: 100 };
export const PROJECT_RATE_RESERVE_FRACTION = 0.2;
const PROJECT_CIRCUIT_KEY = `github-api-v2:${getVercelEnvironment()}`;

interface SharedBudgetStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, options?: { ttl?: number; name?: string; tags?: string[] }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface CircuitState {
  version: 1;
  state: "open";
  reason: "github_budget" | "github_rate_limit";
  limitKind: RateLimitKind | RequestKind;
  openedAt: number;
  retryAt: number;
  remaining: number | null;
}

interface ClientWindow {
  startedAt: number;
  total: number;
  usernames: Set<string>;
}

function isCircuitState(value: unknown): value is CircuitState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<CircuitState>;
  return state.version === 1 && state.state === "open"
    && (state.reason === "github_budget" || state.reason === "github_rate_limit")
    && typeof state.openedAt === "number" && typeof state.retryAt === "number"
    && (state.remaining === null || typeof state.remaining === "number");
}

function secondsUntil(timestamp: number, now: number): number {
  return Math.min(3_600, Math.max(1, Math.ceil((timestamp - now) / 1_000)));
}

function telemetryContext(context?: GitHubRequestProtectionContext) {
  return {
    correlation_id: context?.correlationId ?? randomUUID(),
    subject_id: context?.subjectId ?? "project-budget",
  };
}

export function createGitHubRequestProtectionContext(
  headers: Headers,
  surface: GitHubRequestProtectionContext["surface"],
  username: string,
  correlationId: string = randomUUID()
): GitHubRequestProtectionContext {
  const vercelRequest = headers.get("x-vercel-id");
  const forwarded = headers.get("x-vercel-forwarded-for");
  const ip = vercelRequest && forwarded ? forwarded.split(",")[0]?.trim() : "";
  return {
    clientKey: ip ? createHash("sha256").update(ip).digest("hex").slice(0, 24) : null,
    surface,
    correlationId,
    subjectId: createHash("sha256").update(username.trim().toLowerCase()).digest("hex").slice(0, 12),
  };
}

const NON_INTERACTIVE_PROFILE_AGENT = /(?:bot|crawler|spider|preview|facebookexternalhit|linkedin|slack|discord|whatsapp|github-camo|curl\/|wget\/)/i;

/** Crawlers still receive the SSR V1 profile, metadata, badge and cards; they do not start cold V2 work. */
export function shouldScheduleProfileEnrichment(headers: Headers): boolean {
  const userAgent = headers.get("user-agent")?.trim();
  return Boolean(userAgent && !NON_INTERACTIVE_PROFILE_AGENT.test(userAgent));
}

export interface GitHubProjectProtectionOptions {
  store?: SharedBudgetStore | null;
  now?: () => number;
  clientWindowMs?: number;
  maxUniqueColdUsernames?: number;
  maxColdWork?: number;
  reserve?: Readonly<Record<RequestKind, number>>;
}

/**
 * Cache-aware protection boundary. Exact client counters and half-open probes are process-local;
 * confirmed GitHub pressure is shared through Runtime Cache without pretending it is a CAS lock.
 */
export class GitHubProjectProtection {
  private readonly store: SharedBudgetStore | null;
  private readonly now: () => number;
  private readonly clientWindowMs: number;
  private readonly maxUniqueColdUsernames: number;
  private readonly maxColdWork: number;
  private readonly reserve: Readonly<Record<RequestKind, number>>;
  private readonly clients = new Map<string, ClientWindow>();
  private localCircuit: CircuitState | null = null;
  private halfOpenProbe = false;

  constructor(options: GitHubProjectProtectionOptions = {}) {
    this.store = options.store === undefined
      ? (isVercelRuntime() ? getCache({ namespace: "github-rpg-project-budget" }) : null)
      : options.store;
    this.now = options.now ?? Date.now;
    this.clientWindowMs = options.clientWindowMs ?? CLIENT_RATE_WINDOW_MS;
    this.maxUniqueColdUsernames = options.maxUniqueColdUsernames ?? CLIENT_RATE_MAX_UNIQUE_COLD_USERNAMES;
    this.maxColdWork = options.maxColdWork ?? CLIENT_RATE_MAX_COLD_WORK;
    this.reserve = options.reserve ?? PROJECT_RATE_RESERVE;
  }

  async beforeColdWork(username: string, context?: GitHubRequestProtectionContext): Promise<void> {
    this.enforceClient(username, context);
    const circuit = await this.readCircuit();
    const now = this.now();
    if (!circuit) return;
    if (circuit.retryAt > now) {
      const retryAfter = secondsUntil(circuit.retryAt, now);
      emitV2Telemetry({ event: "project_budget_denied", ...telemetryContext(context), reason: circuit.reason, retry_after_seconds: retryAfter, remaining: circuit.remaining });
      throw new ProjectBudgetDeniedError(circuit.reason, retryAfter);
    }
    if (this.halfOpenProbe) {
      emitV2Telemetry({ event: "project_budget_denied", ...telemetryContext(context), reason: "half_open_probe_active", retry_after_seconds: 5 });
      throw new ProjectBudgetDeniedError("github_rate_limit", 5);
    }
    this.halfOpenProbe = true;
    emitV2Telemetry({ event: "circuit_half_open", ...telemetryContext(context), reason: circuit.reason });
  }

  async observeSuccess(context?: GitHubRequestProtectionContext): Promise<void> {
    if (!this.halfOpenProbe) return;
    this.halfOpenProbe = false;
    this.localCircuit = null;
    await this.store?.delete(PROJECT_CIRCUIT_KEY).catch(() => undefined);
    emitV2Telemetry({ event: "circuit_recovered", ...telemetryContext(context) });
  }

  async observeProbeFailure(context?: GitHubRequestProtectionContext): Promise<void> {
    if (!this.halfOpenProbe) return;
    const previous = this.localCircuit;
    this.halfOpenProbe = false;
    await this.open(previous?.reason ?? "github_rate_limit", previous?.limitKind ?? "secondary", this.now() + 60_000, previous?.remaining ?? null, context);
  }

  async observeSnapshot(kind: RequestKind, snapshot: RateLimitSnapshot, context?: GitHubRequestProtectionContext): Promise<void> {
    if (snapshot.remaining === null) return;
    const criticalReserve = snapshot.limit && snapshot.limit > 0
      ? Math.max(1, Math.min(this.reserve[kind], Math.floor(snapshot.limit * PROJECT_RATE_RESERVE_FRACTION)))
      : this.reserve[kind];
    if (snapshot.remaining > criticalReserve) {
      if (this.localCircuit?.reason === "github_budget" && this.localCircuit.limitKind === kind && this.localCircuit.retryAt > this.now()) {
        this.localCircuit = null;
        this.halfOpenProbe = false;
        await this.store?.delete(PROJECT_CIRCUIT_KEY).catch(() => undefined);
        emitV2Telemetry({ event: "rate_limit_false_positive_suspected", ...telemetryContext(context), resource: kind, remaining: snapshot.remaining, critical_reserve: criticalReserve });
        emitV2Telemetry({ event: "circuit_recovered", ...telemetryContext(context), reason: "higher_authoritative_snapshot" });
      }
      return;
    }
    const retryAt = snapshot.resetAt?.getTime();
    if (!retryAt || retryAt <= this.now()) return;
    emitV2Telemetry({ event: "github_primary_rate_limited", ...telemetryContext(context), resource: kind, remaining: snapshot.remaining, reset_at: snapshot.resetAt?.toISOString() ?? null, critical_reserve: criticalReserve });
    await this.open("github_budget", kind, retryAt, snapshot.remaining, context);
  }

  async observeRateLimit(error: GitHubRateLimitError, context?: GitHubRequestProtectionContext): Promise<void> {
    const retryAt = error.resetAt?.getTime() ?? this.now() + 60_000;
    emitV2Telemetry({ event: error.limitKind === "secondary" ? "github_secondary_rate_limited" : "github_primary_rate_limited", ...telemetryContext(context), remaining: error.remaining, reset_at: error.resetAt?.toISOString() ?? null });
    await this.open("github_rate_limit", error.limitKind, retryAt, error.remaining, context);
  }

  private enforceClient(username: string, context?: GitHubRequestProtectionContext): void {
    if (!context?.clientKey) return; // Outside Vercel there is no platform-authenticated address: fail open.
    const now = this.now();
    let window = this.clients.get(context.clientKey);
    if (!window || now - window.startedAt >= this.clientWindowMs) {
      window = { startedAt: now, total: 0, usernames: new Set() };
      this.clients.set(context.clientKey, window);
    }
    const normalized = username.trim().toLowerCase();
    const nextUnique = window.usernames.has(normalized) ? window.usernames.size : window.usernames.size + 1;
    if (window.total >= this.maxColdWork || nextUnique > this.maxUniqueColdUsernames) {
      const retryAfter = secondsUntil(window.startedAt + this.clientWindowMs, now);
      emitV2Telemetry({ event: "client_rate_limited", ...telemetryContext(context), surface: context.surface, retry_after_seconds: retryAfter, unique_usernames: window.usernames.size, cold_work: window.total });
      throw new ProjectBudgetDeniedError("client_rate", retryAfter);
    }
    window.total++;
    window.usernames.add(normalized);
    if (this.clients.size > 5_000) {
      for (const [key, candidate] of this.clients) if (now - candidate.startedAt >= this.clientWindowMs) this.clients.delete(key);
    }
  }

  private async readCircuit(): Promise<CircuitState | null> {
    const now = this.now();
    if (this.localCircuit && this.localCircuit.retryAt > now) return this.localCircuit;
    const shared = await this.store?.get(PROJECT_CIRCUIT_KEY).catch(() => null);
    if (isCircuitState(shared)) {
      this.localCircuit = shared;
      return shared;
    }
    return this.localCircuit;
  }

  private async open(
    reason: CircuitState["reason"],
    limitKind: CircuitState["limitKind"],
    retryAt: number,
    remaining: number | null,
    context?: GitHubRequestProtectionContext
  ): Promise<void> {
    const state: CircuitState = { version: 1, state: "open", reason, limitKind, openedAt: this.now(), retryAt, remaining };
    const transition = !this.localCircuit || this.localCircuit.retryAt <= this.now();
    this.localCircuit = state;
    this.halfOpenProbe = false;
    await this.store?.set(PROJECT_CIRCUIT_KEY, state, {
      ttl: secondsUntil(retryAt, this.now()),
      name: "github-rpg-project-budget",
      tags: ["github-rpg", "project-budget"],
    }).catch(() => undefined);
    if (transition) emitV2Telemetry({ event: "circuit_opened", ...telemetryContext(context), reason, resource: limitKind, remaining, retry_after_seconds: secondsUntil(retryAt, this.now()) });
  }
}

let singleton: GitHubProjectProtection | null = null;

export function getGitHubProjectProtection(): GitHubProjectProtection {
  singleton ??= new GitHubProjectProtection();
  return singleton;
}
