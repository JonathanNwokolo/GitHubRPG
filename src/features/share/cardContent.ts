import { describeYear } from "@/features/chronicle/chronicleText";
import { findShareableChapter } from "@/features/chronicle/shareableChapters";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import { describeProgress } from "@/features/progress/progressView";
import type { RPGCharacter } from "@/game/types";
import { getTranslation, type SupportedLanguage } from "@/i18n";
import type { AchievementCardLayoutProps } from "./AchievementCardLayout";
import type { ChronicleCardLayoutProps } from "./ChronicleCardLayout";

/**
 * What the Achievement and Chronicle cards say, composed from data the engine and the Chronicle already
 * produced. A card exists only for something that is really in THIS character: the id in a URL selects,
 * it never creates. Pure (no network, no image rendering), so the rules are unit-testable.
 */

/** Everything the layout needs except what only the route knows (the avatar bytes and the host). */
export type AchievementCardContent = Omit<AchievementCardLayoutProps, "avatarSrc" | "host">;
export type ChronicleCardContent = Omit<ChronicleCardLayoutProps, "avatarSrc" | "host">;

/** Achievement ids look like "age-5" or "commits-1000". Anything else is rejected before the lookup. */
const ACHIEVEMENT_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

export function isValidAchievementId(raw: string): boolean {
  return ACHIEVEMENT_ID_PATTERN.test(raw);
}

function displayNameOf(character: RPGCharacter): string {
  return character.identity.displayName?.trim() || character.identity.username;
}

/** The card of an UNLOCKED achievement of this character, or null (unknown id, or still locked). */
export function buildAchievementCardContent(
  character: RPGCharacter,
  achievementId: string,
  language: SupportedLanguage
): AchievementCardContent | null {
  const achievement = character.achievements.find((candidate) => candidate.id === achievementId);
  if (!achievement || !achievement.unlocked) return null;

  const t = getTranslation(language);
  const progress = describeProgress(achievement, t, language);

  return {
    username: character.identity.username,
    displayName: displayNameOf(character),
    texts: { kicker: t.cards.achievementKicker, rarityLabel: t.rarity[achievement.rarity], cta: t.cards.cta },
    achievement: {
      name: achievement.name,
      description: achievement.description,
      rarity: achievement.rarity,
      progress: progress.state === "unavailable" ? null : progress.headline,
    },
  };
}

/** The card of a shareable chapter of THIS chronicle, or null (no such chapter, or not one worth a card). */
export function buildChronicleCardContent(
  character: RPGCharacter,
  chronicle: DeveloperChronicle,
  year: number,
  language: SupportedLanguage
): ChronicleCardContent | null {
  const entry = findShareableChapter(chronicle, year);
  if (!entry) return null;

  const t = getTranslation(language);
  const view = describeYear(entry, chronicle, language);

  return {
    username: character.identity.username,
    displayName: displayNameOf(character),
    texts: { kicker: t.cards.chapterKicker, cta: t.cards.cta },
    chapter: {
      year: entry.year,
      title: view.title,
      description: view.description,
      metrics: view.metrics.map((metric) => `${metric.value} ${metric.label}`),
      note: view.unknownNote,
    },
  };
}
