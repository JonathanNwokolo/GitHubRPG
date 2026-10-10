import { resolveEquippedTitle } from "@/features/titles/equippedTitle";
import { resolvePublicEquippedTitle, type RPGCharacterV2Public } from "@/game-v2/publicProjection";
import type { ClassName, RPGCharacter } from "@/game/types";
import type { SupportedLanguage } from "@/i18n";
import { localizeClassName, localizeTitle } from "@/i18n/gameContent";

/**
 * The words a hero is introduced with when it is shared (the social card and the post text). Pure (no React, no
 * network), and it follows the SAME precedence as the character sheet: with a V2 result the class, subclass,
 * evolution and title come from V2, otherwise from the V1 engine. Presentation only: it never feeds the engine.
 */

export interface HeroIdentityTexts {
  className: string;
  /**
   * Which insignia the class wears (RpgClassIcon maps it, so every class works). The V2 projection types the class as
   * a plain string: RpgClassIcon falls back to the generic insignia for anything outside the known classes.
   */
  classIcon: ClassName;
  /** The subclass insignia: V1 only, exactly as the sheet shows it (a V2 specialization has no icon). */
  subclassIcon: ClassName | null;
  /** null when the hero has none (V2: no confident specialization). Never an empty string. */
  subclassName: string | null;
  evolutionName: string | null;
}

function pick(text: { pt: string; en: string }, language: SupportedLanguage): string {
  return language === "pt-BR" ? text.pt : text.en;
}

export function resolveHeroIdentity(
  character: RPGCharacter,
  v2: RPGCharacterV2Public | null | undefined,
  language: SupportedLanguage
): HeroIdentityTexts {
  const { archetype } = character;
  // With a V2 result the subclass comes only from V2 (null means none): the V1 subclass must not leak in.
  const subclassName = v2
    ? v2.identity.subclass
      ? pick(v2.identity.subclass.name, language)
      : null
    : archetype.subclassName
      ? localizeClassName(archetype.subclassName, language)
      : null;
  return {
    className: localizeClassName(v2?.identity.className ?? archetype.className, language),
    classIcon: (v2?.identity.className ?? archetype.className) as ClassName,
    subclassIcon: v2 ? null : (archetype.subclassName ?? null),
    subclassName: subclassName?.trim() || null,
    evolutionName: v2?.identity.evolution ? pick(v2.identity.evolution.name, language).trim() || null : null,
  };
}

/**
 * The equipped title's display name: the visitor's saved pick when it is unlocked, else the engine's default; V2
 * first, then V1 (the exact order the character sheet uses). null when the hero has no unlocked title.
 */
export function resolveHeroTitleName(
  character: RPGCharacter,
  v2: RPGCharacterV2Public | null | undefined,
  savedTitleId: string | undefined,
  language: SupportedLanguage
): string | null {
  const v2Title = v2 ? resolvePublicEquippedTitle(v2.titles, savedTitleId, v2.defaultTitleId) : null;
  if (v2Title) return pick(v2Title.name, language).trim() || null;
  const v1Title = resolveEquippedTitle(character.titles, savedTitleId, character.defaultTitleId);
  return v1Title ? localizeTitle(v1Title, language).name.trim() || null : null;
}
