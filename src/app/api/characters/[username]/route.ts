import { NextResponse } from "next/server";
import { describeError } from "@/data/api/errorResponse";
import { createDataSource } from "@/data/datasource";
import { loadCharacter } from "@/data/loadCharacter";

/**
 * Browser -> this route -> GitHubDataSource -> ... -> RPGCharacter.
 * Runs on the server only, so the GitHub credential never leaves it.
 */
export const dynamic = "force-dynamic";

/** Shared caches (CDN) may keep a character 15 min (the server-side TTL) and serve it stale for 5 more. */
const SUCCESS_CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=300";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    const character = await loadCharacter(username, createDataSource());
    return NextResponse.json(character, { headers: { "Cache-Control": SUCCESS_CACHE_CONTROL } });
  } catch (error) {
    const { status, body, headers, logLine } = describeError(error, new Date());
    if (logLine) console.error(`[github-rpg] ${status} ${logLine}`);
    return NextResponse.json(body, { status, headers: { ...headers, "Cache-Control": "no-store" } });
  }
}
