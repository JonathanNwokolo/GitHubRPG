import React from "react";
import { createDataSource } from "@/data/datasource";
import { loadCharacter } from "@/data/loadCharacter";
import { AchievementCardLayout } from "@/features/share/AchievementCardLayout";
import { buildAchievementCardContent, isValidAchievementId } from "@/features/share/cardContent";
import { getSiteHost } from "@/lib/siteUrl";
import {
  cardBadRequest,
  cardErrorResponse,
  cardNotFound,
  parseCardLanguage,
  renderCardImage,
  resolveAvatarSrc,
} from "../../../cardResponse";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Conquista não encontrada (404)";

/**
 * The card of ONE unlocked achievement. The id only SELECTS: the route loads the real character and answers
 * 404 unless that achievement is in its catalog AND unlocked for that user, so a URL can never fabricate a card.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ username: string; achievementId: string }> }
) {
  try {
    const { username, achievementId } = await context.params;
    let decodedUsername: string;
    let decodedId: string;
    try {
      decodedUsername = decodeURIComponent(username).trim();
      decodedId = decodeURIComponent(achievementId);
    } catch {
      return cardBadRequest("Endereço inválido");
    }
    if (!decodedUsername) return cardBadRequest("Nome de usuário inválido");
    if (!isValidAchievementId(decodedId)) return cardBadRequest("Identificador de conquista inválido");

    const character = await loadCharacter(decodedUsername, createDataSource());
    if (!character.calculationCoverage.sharing.calculatedNumbersPublishable) {
      return new Response("Ficha parcialmente indisponível", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const content = buildAchievementCardContent(character, decodedId, parseCardLanguage(request.url));
    if (!content) return cardNotFound(NOT_FOUND);

    return renderCardImage(
      <AchievementCardLayout {...content} avatarSrc={await resolveAvatarSrc(character)} host={getSiteHost()} />
    );
  } catch (error) {
    return cardErrorResponse(error, "Perfil de herói não encontrado (404)");
  }
}
