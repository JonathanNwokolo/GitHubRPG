import { flameLevel } from "@/features/activity-flame/buildActivityFlame";
import type { ActivityFlameModel, FlameLevel, FlameYear } from "@/features/activity-flame/types";
import type { CharacterPresentationModel } from "@/game-v2/publicProjection";
import type { ClassName, RPGCharacter } from "@/game/types";
import { getTranslation, type SupportedLanguage } from "@/i18n";
import { localizeProgressionTier } from "@/i18n/gameContent";
import { formatNumber, pluralize } from "@/lib/format";
import { resolveHeroIdentity, resolveHeroTitleName } from "./heroIdentity";

/**
 * What the Hero Social Card says, composed from data the engine, the V2 projection and the Activity Flame already
 * produced. Pure (no network, no clock, no image rendering): the card is only ever a view of THIS character, and a
 * card that cannot be honest is not built at all.
 */

/** The 4:5 portrait format of social feeds. */
export const SOCIAL_CARD_SIZE = { width: 1080, height: 1350 } as const;

const MAX_AFFINITIES = 3;
const MAX_NAME_LENGTH = 36;

/**
 * The renderer ships a single Latin font: anything else would be drawn as an empty box. Used to fall back from a
 * display name written in another script to the username, which is always ASCII.
 */
const RENDERABLE_TEXT = /^[ -~ -ſ‐-―‘-‟•…]+$/;

export function isRenderableCardText(text: string): boolean {
  return RENDERABLE_TEXT.test(text);
}

export interface SocialCardAffinity {
  name: string;
  /** "42%", or null when the figure is not exact. */
  share: string | null;
}

export interface SocialCardFlame {
  year: number;
  inProgress: boolean;
  /** One level per day read, January 1st first. Computed with the sheet's own cutoffs. */
  levels: FlameLevel[];
  /** Day of the week (0 = Sunday) of January 1st: the row where the first column starts. */
  startDow: number;
  /** Days before this index are before the hero existed and are drawn unlit. */
  firstDayIndex: number;
  /** At most three, already formatted and translated: contributions, longest streak, active days. */
  metrics: Array<{ id: "contributions" | "longestStreak" | "activeDays"; label: string; value: string }>;
}

export interface SocialCardTexts {
  kicker: string;
  level: string;
  affinities: string;
  evolution: string;
  flame: string;
  flameInProgress: string;
  disclaimer: string;
}

export interface SocialCardContent {
  language: SupportedLanguage;
  username: string;
  displayName: string;
  title: string | null;
  className: string;
  /** The insignia of the class and of the subclass (V1 only), resolved by the sheet's own class -> icon mapping. */
  classIcon: ClassName;
  subclassIcon: ClassName | null;
  subclassName: string | null;
  evolutionName: string | null;
  level: number;
  tier: string;
  affinities: SocialCardAffinity[];
  /** null when the calendar cannot be shown honestly: the card then simply has no flame panel. */
  flame: SocialCardFlame | null;
  texts: SocialCardTexts;
}

export type SocialCardResult =
  | { status: "ready"; content: SocialCardContent }
  /** The calculated numbers cannot be published (partial data): no card, never a degraded one. */
  | { status: "unavailable" }
  /** V2 is still being resolved: the card would show a class the sheet is about to replace. Retry shortly. */
  | { status: "pending" };

export interface SocialCardInput {
  character: RPGCharacter;
  presentation: CharacterPresentationModel;
  activityFlame?: ActivityFlameModel;
  /** The visitor's equipped title id, if any. Only an unlocked title of THIS hero is ever used. */
  titleId?: string;
  language: SupportedLanguage;
}

function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/**
 * The year the card shows: the most recent READ year in which the flame was lit. An absent year is never drawn as
 * an empty one, and a calendar in which nothing was ever lit has nothing worth a panel.
 */
export function pickCardFlameYear(model: ActivityFlameModel | undefined): FlameYear | null {
  if (!model || model.coverage === "unavailable" || model.totalContributions === 0) return null;
  for (let index = model.years.length - 1; index >= 0; index--) {
    if (model.years[index].stats.contributions > 0) return model.years[index];
  }
  return null;
}

function buildFlame(model: ActivityFlameModel | undefined, language: SupportedLanguage): SocialCardFlame | null {
  const year = pickCardFlameYear(model);
  if (!model || !year) return null;

  const t = getTranslation(language);
  const flameT = t.activityFlame;
  const { stats } = year;
  const streakDays = stats.longestStreak?.days ?? 0;
  // The sheet writes "≥ 148"; the card font has no such glyph, so a lower bound is written "148+".
  const streakExact = stats.longestStreak?.exact ?? true;
  const streakValue = `${formatNumber(streakDays, language)}${streakExact ? "" : "+"} ${pluralize(streakDays, flameT.units.day)}`;

  return {
    year: year.year,
    inProgress: year.inProgress,
    levels: year.counts.map((count) => flameLevel(count, model.cutoffs)),
    startDow: new Date(Date.UTC(year.year, 0, 1)).getUTCDay(),
    firstDayIndex: year.firstDayIndex,
    metrics: [
      { id: "contributions", label: t.heroShare.card.contributions, value: formatNumber(stats.contributions, language) },
      { id: "longestStreak", label: t.heroShare.card.longestStreak, value: streakValue },
      { id: "activeDays", label: t.heroShare.card.activeDays, value: formatNumber(stats.activeDays, language) },
    ],
  };
}

export function buildSocialCardContent(input: SocialCardInput): SocialCardResult {
  const { character, presentation, language } = input;

  if (!character.calculationCoverage.sharing.calculatedNumbersPublishable) return { status: "unavailable" };
  // V2 is on but not resolved yet (the sheet shows its forge loading): wait, do not fall back to V1 behind its back.
  if (presentation.v2Enabled && !presentation.v2 && presentation.delivery === "enriching") return { status: "pending" };

  const v2 = presentation.v2;
  const t = getTranslation(language);
  const identity = resolveHeroIdentity(character, v2, language);
  const username = character.identity.username;
  const named = character.identity.displayName?.trim();

  const affinities: SocialCardAffinity[] = v2
    ? v2.grimoire.affinities.map((affinity) => ({
        name: affinity.name,
        share: affinity.coverage === "full" ? `${formatNumber(affinity.sharePercent, language)}%` : null,
      }))
    : character.skills.map((skill) => ({ name: skill.name, share: `${formatNumber(skill.sharePercent, language)}%` }));

  return {
    status: "ready",
    content: {
      language,
      username,
      displayName: clip(named && isRenderableCardText(named) ? named : username, MAX_NAME_LENGTH),
      title: resolveHeroTitleName(character, v2, input.titleId, language),
      className: identity.className,
      classIcon: identity.classIcon,
      subclassIcon: identity.subclassName ? identity.subclassIcon : null,
      subclassName: identity.subclassName,
      evolutionName: identity.evolutionName,
      level: character.progression.level,
      tier: localizeProgressionTier(character.progression.tier, language),
      affinities: affinities.filter((affinity) => affinity.name.trim() !== "").slice(0, MAX_AFFINITIES),
      flame: buildFlame(input.activityFlame, language),
      texts: {
        kicker: t.heroShare.card.kicker,
        level: t.character.level.toUpperCase(),
        affinities: t.heroShare.card.affinities,
        evolution: t.heroShare.card.evolution,
        flame: t.heroShare.card.flame,
        flameInProgress: t.heroShare.card.flameInProgress,
        disclaimer: t.heroShare.card.disclaimer,
      },
    },
  };
}
