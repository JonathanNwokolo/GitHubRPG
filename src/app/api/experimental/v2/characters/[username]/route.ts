import { after, NextResponse } from "next/server";
import { describeError } from "@/data/api/errorResponse";
import { createDataSource } from "@/data/datasource";
import { parseGitHubUsername } from "@/data/github/username";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { ENGINE_VERSION } from "@/game-v2/constants";
import { createProfileFingerprint, getExperimentalV2DeliveryService } from "@/game-v2/runtimeDelivery";
import { projectRPGCharacterV2Public } from "@/game-v2/publicProjection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext { params: Promise<{ username: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const rawUsername = (await context.params).username;
    let decodedUsername: string;
    try { decodedUsername = decodeURIComponent(rawUsername); }
    catch { decodedUsername = ""; }
    const username = parseGitHubUsername(decodedUsername);

    // The normal V1 source remains authoritative for existence/profile data. V2 enrichment is separate.
    const raw = validateRawGitHubData(await createDataSource().getProfile(username));
    const profile = normalizeDeveloperProfile(raw);
    const result = await getExperimentalV2DeliveryService().deliver(
      { profile, sourceFingerprint: createProfileFingerprint(profile) },
      (task) => after(task)
    );
    const status = result.state === "enriching" ? 202 : 200;
    return NextResponse.json({
      engineVersion: ENGINE_VERSION,
      state: result.state,
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
    if (described.logLine) console.error(`[v2-experimental] ${described.logLine}`);
    return NextResponse.json(described.body, {
      status: described.status,
      headers: { ...described.headers, "Cache-Control": "no-store" },
    });
  }
}
