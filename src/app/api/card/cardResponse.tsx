import React from "react";
import { ImageResponse } from "next/og";
import { describeError } from "@/data/api/errorResponse";
import { ProfileNotFoundError } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { fnv1a } from "@/data/seed/hashAndPrng";
import { renderProceduralAvatarSvg } from "@/features/character/avatar/proceduralAvatar";
import { CARD_SIZE } from "@/features/share/cardKit";
import type { RPGCharacter } from "@/game/types";
import type { SupportedLanguage } from "@/i18n";

/** What every card route shares: the image size, caching, the avatar, the language switch and the error mapping. */

export const CARD_CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=300";
/** "This card does not exist (yet)": kept briefly, since an achievement can be unlocked later. */
const NOT_FOUND_CACHE_CONTROL = "public, max-age=60, s-maxage=300";

/** `?lang=en` selects English; anything else is Portuguese. A closed set: no free text reaches the image. */
export function parseCardLanguage(requestUrl: string): SupportedLanguage {
  return new URL(requestUrl).searchParams.get("lang") === "en" ? "en" : "pt-BR";
}

/** The GitHub avatar as a data URI (the renderer fetches nothing itself), or the procedural avatar as fallback. */
export async function resolveAvatarSrc(character: RPGCharacter): Promise<string> {
  const seed = fnv1a(character.identity.username.toLowerCase());
  const fallbackSvg = renderProceduralAvatarSvg(seed, 128);
  const fallbackDataUri = "data:image/svg+xml;base64," + Buffer.from(fallbackSvg).toString("base64");

  if (!character.identity.avatarUrl) return fallbackDataUri;
  try {
    const avatarRes = await fetch(character.identity.avatarUrl, {
      signal: AbortSignal.timeout(3500),
      headers: { "User-Agent": "GitHubRPG-CardGenerator" },
    });
    if (!avatarRes.ok) return fallbackDataUri;
    const arrayBuffer = await avatarRes.arrayBuffer();
    const mime = avatarRes.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  } catch {
    return fallbackDataUri;
  }
}

export function renderCardImage(element: React.ReactElement): ImageResponse {
  return new ImageResponse(element, { ...CARD_SIZE, headers: { "Cache-Control": CARD_CACHE_CONTROL } });
}

export function cardNotFound(message: string): Response {
  return new Response(message, { status: 404, headers: { "Cache-Control": NOT_FOUND_CACHE_CONTROL } });
}

export function cardBadRequest(message: string): Response {
  return new Response(message, { status: 400, headers: { "Cache-Control": "no-store" } });
}

/** A missing profile is a 404; every other failure goes through the shared, friendly error mapping. */
export function cardErrorResponse(error: unknown, notFoundMessage: string): Response {
  if (error instanceof ProfileNotFoundError || error instanceof InvalidUsernameError) {
    return cardNotFound(notFoundMessage);
  }
  const { status, body, headers, logLine } = describeError(error, new Date());
  if (logLine) console.error(`[github-rpg card] ${status} ${logLine}`);
  return new Response(body.error.message, { status, headers: { ...headers, "Cache-Control": "no-store" } });
}
