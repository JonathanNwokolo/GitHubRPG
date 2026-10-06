import React from "react";
import { ImageResponse } from "next/og";
import { describeError } from "@/data/api/errorResponse";
import { createDataSource, ProfileNotFoundError } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { loadCharacter } from "@/data/loadCharacter";
import { generateHeroSummary } from "@/features/share/heroSummary";
import { CARD_SIZE } from "@/features/share/cardKit";
import { HeroCardLayout } from "@/features/share/HeroCardLayout";
import { resolveEquippedTitle } from "@/features/titles/equippedTitle";
import { resolveAvatarSrc } from "../cardResponse";

export const dynamic = "force-dynamic";


const SUCCESS_CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=300";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const decodedUsername = decodeURIComponent(username).trim();

    if (!decodedUsername) {
      return new Response("Nome de usuário inválido", { status: 400 });
    }

    const url = new URL(request.url);
    const requestedTitle = url.searchParams.get("title");

    const character = await loadCharacter(decodedUsername, createDataSource());

    // Resolve equipped title: custom user pick if unlocked, or default
    let equippedTitleName: string | null = null;
    if (requestedTitle) {
      const matching = character.titles.find(
        (t) => t.unlocked && t.name.toLowerCase() === requestedTitle.toLowerCase()
      );
      if (matching) {
        equippedTitleName = matching.name;
      }
    }
    if (!equippedTitleName) {
      const defaultTitle = resolveEquippedTitle(
        character.titles,
        undefined,
        character.defaultTitleId
      );
      equippedTitleName = defaultTitle?.name ?? null;
    }

    const avatarSrc = await resolveAvatarSrc(character);

    const summaryText = generateHeroSummary(character);

    return new ImageResponse(
      (
        <HeroCardLayout
          character={character}
          equippedTitleName={equippedTitleName}
          summaryText={summaryText}
          avatarSrc={avatarSrc}
        />
      ),
      {
        ...CARD_SIZE,
        headers: {
          "Cache-Control": SUCCESS_CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    if (error instanceof ProfileNotFoundError || error instanceof InvalidUsernameError) {
      return new Response("Perfil de herói não encontrado (404)", { status: 404 });
    }

    const { status, body, logLine } = describeError(error, new Date());
    if (logLine) console.error(`[github-rpg card] ${status} ${logLine}`);
    return new Response(body.error.message, { status });
  }
}
