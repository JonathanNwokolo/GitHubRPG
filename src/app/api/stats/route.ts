import { NextResponse } from "next/server";
import { readInvokedProfileCount } from "@/data/usage/invokedProfiles";

/**
 * Public read side of the "unique profiles summoned" counter: one integer, nothing else.
 * Always HTTP 200; `null` means "unknown" (store off, unreachable or kill switch) and the Home simply hides the number.
 */
export const dynamic = "force-dynamic";

/** The CDN absorbs the Redis reads: a few minutes of staleness is irrelevant for a social-proof number. */
const KNOWN_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
/** Short, so an outage is not remembered for long, but still enough to shield the store while it is down. */
const UNKNOWN_CACHE_CONTROL = "public, s-maxage=60";

export async function GET() {
  const uniqueProfilesInvoked = await readInvokedProfileCount();
  return NextResponse.json(
    { uniqueProfilesInvoked },
    { headers: { "Cache-Control": uniqueProfilesInvoked === null ? UNKNOWN_CACHE_CONTROL : KNOWN_CACHE_CONTROL } }
  );
}
