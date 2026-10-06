import {
  LEVEL_MAX,
  LEVEL_MIN,
  LEVEL_TIERS,
  XP_CURVE_BASE,
  XP_CURVE_EXPONENT,
} from "../constants";
import { floorTo } from "../math";
import type { LevelProgress } from "../types";

/**
 * Total XP needed to REACH `level`. The single place where thresholds are computed.
 *
 * The approved conceptual curve is round(100 * n^1.5) but Level 1 must exist with 0 XP,
 * so the curve is applied to the number of levels climbed, n = level - 1:
 *   Level 1 -> 0 XP, Level 2 -> 100, Level 3 -> 283, ... Level 99 -> round(100 * 98^1.5).
 */
export function xpThresholdForLevel(level: number): number {
  const bounded = clampLevel(level);
  return Math.round(XP_CURVE_BASE * (bounded - LEVEL_MIN) ** XP_CURVE_EXPONENT);
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return level > 0 ? LEVEL_MAX : LEVEL_MIN;
  return Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, Math.floor(level)));
}

/** thresholds[level - 1] = XP to reach `level`. Built once. */
const THRESHOLDS: readonly number[] = Array.from({ length: LEVEL_MAX }, (_, i) =>
  xpThresholdForLevel(i + 1)
);

/** XP of Level 99: the most XP the progression score can ever produce. */
export const MAX_XP = THRESHOLDS[LEVEL_MAX - 1];

/** Highest level whose threshold is <= totalXp (binary search, O(log levels)). */
export function levelFromXp(totalXp: number): number {
  const xp = Number.isFinite(totalXp) ? totalXp : totalXp > 0 ? MAX_XP : 0;
  let low = LEVEL_MIN;
  let high = LEVEL_MAX;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (THRESHOLDS[mid - 1] <= xp) low = mid;
    else high = mid - 1;
  }
  return low;
}

export function calculateLevelProgress(rawXp: number): LevelProgress {
  const totalXp = Math.max(0, Math.floor(Number.isFinite(rawXp) ? rawXp : rawXp > 0 ? MAX_XP : 0));
  const level = levelFromXp(totalXp);
  const currentLevelXp = THRESHOLDS[level - 1];

  if (level >= LEVEL_MAX) {
    return {
      totalXp,
      level,
      currentLevelXp,
      nextLevelXp: currentLevelXp,
      xpRemaining: 0,
      progressPercent: 100,
    };
  }

  const nextLevelXp = THRESHOLDS[level];
  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    xpRemaining: nextLevelXp - totalXp,
    // floor so a hair below the next level never displays as 100%
    progressPercent: floorTo(((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 1),
  };
}

/** Tier is a label for a level range; it is NOT a class. */
export function getLevelTier(level: number): string {
  const bounded = clampLevel(level);
  const tier = LEVEL_TIERS.find((t) => bounded >= t.min && bounded <= t.max);
  return tier ? tier.name : LEVEL_TIERS[0].name;
}
