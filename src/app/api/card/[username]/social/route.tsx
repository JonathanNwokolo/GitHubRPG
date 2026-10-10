import React from "react";
import { createDataSource } from "@/data/datasource";
import { loadCharacterProduct } from "@/data/loadCharacter";
import { SocialCardLayout } from "@/features/share/SocialCardLayout";
import { buildSocialCardContent, SOCIAL_CARD_SIZE } from "@/features/share/socialCardContent";
import { getSiteHost } from "@/lib/siteUrl";
import {
  cardBadRequest,
  cardErrorResponse,
  cardUnavailable,
  parseCardLanguage,
  renderCardImage,
  resolveAvatarSrc,
} from "../../cardResponse";
import { loadCardFonts, loadSocialCardArt } from "../../socialCardAssets";

export const dynamic = "force-dynamic";

/** Title ids look like "title-years-5" or "v2-title-..."; anything else is ignored (the engine's default applies). */
const TITLE_ID_PATTERN = /^[A-Za-z0-9:._-]{1,80}$/;

/**
 * The Hero Social Card (1080 x 1350). It is built only from what the sheet itself shows: the same character, the
 * same V2 projection (cache only: this route never starts an enrichment) and the same Activity Flame model, from
 * the profile fetch the sheet already made. A sheet whose numbers are not publishable gets no card at all.
 */
export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    let decodedUsername: string;
    try {
      decodedUsername = decodeURIComponent(username).trim();
    } catch {
      return cardBadRequest("Endereço inválido");
    }
    if (!decodedUsername) return cardBadRequest("Nome de usuário inválido");

    const rawTitle = new URL(request.url).searchParams.get("title");
    const titleId = rawTitle && TITLE_ID_PATTERN.test(rawTitle) ? rawTitle : undefined;

    const product = await loadCharacterProduct(decodedUsername, createDataSource());
    const result = buildSocialCardContent({
      character: product.character,
      presentation: product.presentation,
      activityFlame: product.activityFlame,
      titleId,
      language: parseCardLanguage(request.url),
    });

    if (result.status === "unavailable") {
      return cardUnavailable("Ficha parcialmente indisponível: os números calculados não podem ser publicados agora.");
    }
    if (result.status === "pending") {
      return cardUnavailable("A ficha ainda está sendo preparada. Tente novamente em instantes.", 5);
    }

    const [avatarSrc, art, fonts] = await Promise.all([
      resolveAvatarSrc(product.character),
      loadSocialCardArt(request.url, result.content.username),
      loadCardFonts(),
    ]);

    return renderCardImage(
      <SocialCardLayout
        content={result.content}
        avatarSrc={avatarSrc}
        art={art}
        displayUrl={`${getSiteHost()}/${result.content.username}`}
      />,
      SOCIAL_CARD_SIZE,
      fonts
    );
  } catch (error) {
    return cardErrorResponse(error, "Perfil de herói não encontrado (404)");
  }
}
