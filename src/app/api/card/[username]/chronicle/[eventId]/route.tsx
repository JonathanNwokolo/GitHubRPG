import React from "react";
import { createDataSource } from "@/data/datasource";
import { loadCharacterWithChronicle } from "@/data/loadCharacter";
import { parseChapterYear } from "@/features/chronicle/shareableChapters";
import { buildChronicleCardContent } from "@/features/share/cardContent";
import { ChronicleCardLayout } from "@/features/share/ChronicleCardLayout";
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

const NOT_FOUND = "Capítulo não encontrado (404)";

/**
 * The card of ONE Chronicle chapter, identified by its year. The route loads the real chronicle of that user and
 * answers 404 unless the chapter is in it AND is one of the shareable ones, so a URL can never fabricate a chapter.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ username: string; eventId: string }> }
) {
  try {
    const { username, eventId } = await context.params;
    let decodedUsername: string;
    let decodedId: string;
    try {
      decodedUsername = decodeURIComponent(username).trim();
      decodedId = decodeURIComponent(eventId);
    } catch {
      return cardBadRequest("Endereço inválido");
    }
    if (!decodedUsername) return cardBadRequest("Nome de usuário inválido");
    const year = parseChapterYear(decodedId);
    if (year === null) return cardBadRequest("Identificador de capítulo inválido");

    const { character, chronicle } = await loadCharacterWithChronicle(decodedUsername, createDataSource());
    const content = buildChronicleCardContent(character, chronicle, year, parseCardLanguage(request.url));
    if (!content) return cardNotFound(NOT_FOUND);

    return renderCardImage(
      <ChronicleCardLayout {...content} avatarSrc={await resolveAvatarSrc(character)} host={getSiteHost()} />
    );
  } catch (error) {
    return cardErrorResponse(error, "Perfil de herói não encontrado (404)");
  }
}
