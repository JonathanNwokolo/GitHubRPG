import React from "react";
import {
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
import type { ChronicleHighlightKind, ChronicleRarity } from "./types";

type IconComponent = React.FC<RpgIconProps>;

/** The project's own RPG icon set, never emojis. */
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

/** How a highlight's importance looks. Presentation only: normal = discreet, important = gold, exceptional = glow. */
export const FRAME_RARITY: Record<ChronicleRarity, IconRarity> = {
  normal: "common",
  important: "gold",
  exceptional: "legendary",
};

export const HIGHLIGHT_TEXT: Record<ChronicleRarity, string> = {
  normal: "text-slate-200",
  important: "text-amber-400",
  exceptional: "text-amber-300",
};
