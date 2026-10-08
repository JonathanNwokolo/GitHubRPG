import { after, NextResponse } from "next/server";
import { describeError } from "@/data/api/errorResponse";
import { createDataSource } from "@/data/datasource";
import { isGameEngineV2E2EColdProfile } from "@/data/datasource/config";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import { createMockV2Result } from "@/data/loadCharacter";
import { parseGitHubUsername } from "@/data/github/username";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { ENGINE_VERSION, SCHEMA_VERSION } from "@/game-v2/constants";
import { createProfileFingerprint, getExperimentalV2DeliveryService } from "@/game-v2/runtimeDelivery";
import { projectRPGCharacterV2Public } from "@/game-v2/publicProjection";
import { V2_POLL_CONTRACT_VERSION } from "@/game-v2/pollContract";
import { createV2CorrelationId, createV2SubjectId, emitV2Telemetry } from "@/game-v2/telemetry";
import { createGitHubRequestProtectionContext } from "@/data/github/protection";
import { createRepositoryDiscoverySnapshot } from "@/data/sharedDiscovery";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext { params: Promise<{ username: string }> }

export async function GET(request: Request, context: RouteContext) {
  const requestStarted = performance.now();
  let correlationId = createV2CorrelationId();
  let subjectId = "invalid";
  try {
    const rawUsername = (await context.params).username;
    let decodedUsername: string;
    try { decodedUsername = decodeURIComponent(rawUsername); }
    catch { decodedUsername = ""; }
    const username = parseGitHubUsername(decodedUsername);
    subjectId = createV2SubjectId(username);
    const suppliedPollId = request.headers.get("X-GitHubRPG-Poll-Id");
    if (suppliedPollId && /^[a-zA-Z0-9-]{8,80}$/.test(suppliedPollId)) correlationId = suppliedPollId;
    const pollAttempt = Number(request.headers.get("X-GitHubRPG-Poll-Attempt"));
    const protection = createGitHubRequestProtectionContext(request.headers, "experimental_v2_api", username, correlationId);
    if (Number.isInteger(pollAttempt) && pollAttempt > 0 && pollAttempt <= 20) {
      emitV2Telemetry({ event: pollAttempt === 1 ? "v2_poll_started" : "v2_poll_attempt", correlation_id: correlationId, subject_id: subjectId, attempt: pollAttempt });
    }

    // The normal V1 source remains authoritative for existence/profile data. V2 enrichment is separate.
    const baseStarted = performance.now();
    const source = createDataSource();
    const raw = validateRawGitHubData(await source.getProfile(username, { protection }));
    const profile = normalizeDeveloperProfile(raw);
    const baseDurationMs = Math.round(performance.now() - baseStarted);
    const baseReport = source instanceof GitHubApiDataSource ? source.getReports().at(-1) : undefined;
    emitV2Telemetry({ event: "v2_base_loaded", correlation_id: correlationId, subject_id: subjectId, duration_ms: baseDurationMs, cache_source: baseReport?.cache ?? source.kind, rest_requests: baseReport?.restRequests ?? 0, graphql_requests: baseReport?.graphqlRequests ?? 0 });
    const result = source.kind === "mock" && isGameEngineV2E2EColdProfile(profile.username)
      ? createMockV2Result(profile)
      : await getExperimentalV2DeliveryService().deliver(
          { profile, sourceFingerprint: createProfileFingerprint(profile), repositoryDiscovery: createRepositoryDiscoverySnapshot(raw) ?? undefined, protection, telemetry: { correlationId, subjectId, baseDurationMs } },
          (task) => after(task)
        );
    const totalDurationMs = Math.round(performance.now() - requestStarted);
    emitV2Telemetry({ event: "v2_request_summary", correlation_id: correlationId, subject_id: subjectId, result: result.state, total_ms: totalDurationMs, base_ms: baseDurationMs, lookup_ms: result.durationMs, cache_source: result.state === "stale" ? "stale" : result.source });
    if (Number.isInteger(pollAttempt) && pollAttempt > 0 && result.state !== "enriching" && result.state !== "stale") {
      emitV2Telemetry({ event: "v2_poll_terminal", correlation_id: correlationId, subject_id: subjectId, result: result.state, attempts: pollAttempt, total_ms: totalDurationMs });
    }
    const status = result.state === "enriching" ? 202 : 200;
    return NextResponse.json({
      contractVersion: V2_POLL_CONTRACT_VERSION,
      engineVersion: ENGINE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      state: result.state,
      terminal: result.state !== "enriching" && result.state !== "stale",
      source: result.source,
      ...(result.character ? {
        character: projectRPGCharacterV2Public(result.character),
        coverage: result.character.explanation.subclass.coverage,
      } : {}),
      stale: result.state === "stale",
      enrichmentStarted: result.enrichmentStarted ?? false,
      timings: { lookupMs: result.durationMs },
    }, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-GitHubRPG-V2-State": result.state,
        "X-GitHubRPG-V2-Cache": result.source,
      },
    });
  } catch (error) {
    const described = describeError(error, new Date());
    const retryAfterSeconds = described.body.error.retryAfterSeconds;
    emitV2Telemetry({
      event: described.body.error.code === "rate_limited" ? "v2_rate_limited" : described.body.error.code === "timeout" ? "v2_timeout" : described.body.error.code === "not_found" ? "v2_profile_not_found" : "v2_request_failed",
      correlation_id: correlationId,
      subject_id: subjectId,
      error_kind: described.body.error.code,
      total_ms: Math.round(performance.now() - requestStarted),
    });
    return NextResponse.json({
      ...described.body,
      contractVersion: V2_POLL_CONTRACT_VERSION,
      engineVersion: ENGINE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      state: described.body.error.code === "rate_limited" ? "enriching" : "unavailable",
      terminal: described.body.error.code !== "rate_limited",
      ...(retryAfterSeconds ? { retryAfterMs: Math.min(60_000, Math.max(1_000, retryAfterSeconds * 1_000)) } : {}),
    }, {
      status: described.status,
      headers: { ...described.headers, "Cache-Control": "no-store" },
    });
  }
}
