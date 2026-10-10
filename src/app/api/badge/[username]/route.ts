import { describeError } from "@/data/api/errorResponse";
import { createDataSource, ProfileNotFoundError } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { loadCharacter } from "@/data/loadCharacter";
import { buildBadgeSvg } from "@/features/badge/badgeSvg";

/**
 * README badge (SVG). It reuses `loadCharacter` and therefore the data source's own cache: no extra GitHub
 * request is made for a badge, and a repeated badge hit within the cache window costs none at all.
 * No cookies, no session, no authentication: the response depends only on the public profile.
 */
export const dynamic = "force-dynamic";

/**
 * The level and class of a profile move slowly, and GitHub's image proxy (camo) plus every README viewer
 * would otherwise hit this route constantly. Browsers/proxies keep it 30 min, the CDN 1 h, and a stale copy
 * may be served for a day while it revalidates in the background.
 */
const SUCCESS_CACHE_CONTROL = "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400";
const SUCCESS_CDN_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
/** A missing profile is cached briefly so scans of unknown names do not each cost a GitHub lookup. */
const NOT_FOUND_CACHE_CONTROL = "public, max-age=60, s-maxage=300";

/** Even when someone opens the SVG directly, it can run no script and load nothing. */
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
} as const;

function textResponse(status: number, message: string, cacheControl: string): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    let decoded: string;
    try {
      decoded = decodeURIComponent(username).trim();
    } catch {
      return textResponse(404, "Perfil de herói não encontrado (404)", NOT_FOUND_CACHE_CONTROL);
    }

    const character = await loadCharacter(decoded, createDataSource());
    if (!character.calculationCoverage.sharing.calculatedNumbersPublishable) {
      return textResponse(503, "Ficha parcialmente indisponível: o nível não pode ser publicado agora.", "no-store");
    }
    const svg = buildBadgeSvg({
      username: character.identity.username,
      level: character.progression.level,
      className: character.archetype.className,
      subclassName: character.archetype.subclassName,
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": SUCCESS_CACHE_CONTROL,
        // A targeted header prevents Vercel from consuming the shared-cache directives in Cache-Control.
        "CDN-Cache-Control": SUCCESS_CDN_CACHE_CONTROL,
        ...SECURITY_HEADERS,
      },
    });
  } catch (error) {
    if (error instanceof ProfileNotFoundError || error instanceof InvalidUsernameError) {
      return textResponse(404, "Perfil de herói não encontrado (404)", NOT_FOUND_CACHE_CONTROL);
    }
    const { status, body, headers, logLine } = describeError(error, new Date());
    if (logLine) console.error(`[github-rpg badge] ${status} ${logLine}`);
    const response = textResponse(status, body.error.message, "no-store");
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    return response;
  }
}
