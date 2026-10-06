import React from "react";
import {
  RpgCalendar,
  RpgCompass,
  RpgCrown,
  RpgClock,
  RpgMana,
  RpgShield,
  RpgSparkles,
  RpgSwords,
  RpgTome,
  RpgUsers,
  RpgZap,
  type IconRarity,
  type RpgIconProps,
} from "@/design-system";
import type { ChronicleChapterId, ChronicleHighlightKind, ChronicleRarity } from "./types";

type IconComponent = React.FC<RpgIconProps>;

/** The project's own RPG icon set, never emojis. */
export const CHAPTER_ICON: Record<ChronicleChapterId, IconComponent> = {
  journeyStart: RpgTome,
  firstSteps: RpgSparkles,
  rhythmGrows: RpgZap,
  greatAdvance: RpgZap,
  constructionSeason: RpgSwords,
  collaborationEra: RpgUsers,
  legendaryYear: RpgMana,
  returnToJourney: RpgCompass,
  steadyMarch: RpgShield,
  historicMilestone: RpgCrown,
  quietSeason: RpgClock,
  currentChapter: RpgCalendar,
};

export const HIGHLIGHT_ICON: Record<ChronicleHighlightKind, IconComponent> = {
  firstChapter: RpgTome,
  firstActivity: RpgSparkles,
  mostActiveYear: RpgMana,
  peakCommits: RpgSwords,
  peakCollaboration: RpgUsers,
  longestStreak: RpgShield,
  growth: RpgZap,
  decline: RpgClock,
  return: RpgCompass,
  milestone: RpgCrown,
};

/** How an event's importance looks. Presentation only: normal = discreet, important = gold, exceptional = glow. */
export const FRAME_RARITY: Record<ChronicleRarity, IconRarity> = {
  normal: "common",
  important: "gold",
  exceptional: "legendary",
};

export const CARD_BORDER: Record<ChronicleRarity, string> = {
  normal: "border-rpg-border",
  important: "border-rpg-goldDark",
  exceptional: "border-amber-400 shadow-pixel-gold",
};

export const HIGHLIGHT_TEXT: Record<ChronicleRarity, string> = {
  normal: "text-slate-200",
  important: "text-amber-400",
  exceptional: "text-amber-300",
};
