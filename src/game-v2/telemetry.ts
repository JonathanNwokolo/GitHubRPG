import { createHash, randomUUID } from "node:crypto";

export type V2ErrorKind = "github_rate_limit" | "github_network" | "github_5xx" | "timeout" | "invalid_payload" | "cache_error" | "collector_error" | "unknown";

export interface V2TelemetryEvent {
  event: string;
  correlation_id: string;
  subject_id: string;
  [key: string]: string | number | boolean | null | undefined;
}

export function createV2CorrelationId(): string {
  return randomUUID();
}

export function createV2SubjectId(username: string): string {
  return createHash("sha256").update(username.trim().toLowerCase()).digest("hex").slice(0, 12);
}

/** Best-effort structured logs. Telemetry must never affect profile delivery. */
export function emitV2Telemetry(event: V2TelemetryEvent): void {
  try { console.info(JSON.stringify(event)); } catch { /* observability is non-critical */ }
}

export function classifyV2Error(error: unknown): V2ErrorKind {
  const value = error instanceof Error ? `${error.name}:${error.message}`.toLowerCase() : String(error).toLowerCase();
  if (/rate.?limit|http_429|secondary/.test(value)) return "github_rate_limit";
  if (/abort|timeout|hard_budget/.test(value)) return "timeout";
  if (/http_5\d\d|upstream/.test(value)) return "github_5xx";
  if (/network|fetch failed|econn|enotfound/.test(value)) return "github_network";
  if (/invalid|schema|payload/.test(value)) return "invalid_payload";
  if (/cache/.test(value)) return "cache_error";
  if (/collector|github_v21/.test(value)) return "collector_error";
  return "unknown";
}
