import { describe, expect, it } from "vitest";
import { LEVEL_MAX } from "../constants";
import { MAX_XP, calculateLevelProgress, getLevelTier, levelFromXp, xpThresholdForLevel } from "./level";

describe("xpThresholdForLevel", () => {
  it("starts at 0 XP for Level 1 and applies round(100 * n^1.5) to levels climbed", () => {
    expect(xpThresholdForLevel(1)).toBe(0);
    expect(xpThresholdForLevel(2)).toBe(100);
    expect(xpThresholdForLevel(3)).toBe(Math.round(100 * 2 ** 1.5));
    expect(xpThresholdForLevel(99)).toBe(Math.round(100 * 98 ** 1.5));
    expect(MAX_XP).toBe(xpThresholdForLevel(99));
  });

  it("is strictly increasing from Level 1 to 99", () => {
    for (let level = 2; level <= LEVEL_MAX; level++) {
      expect(xpThresholdForLevel(level)).toBeGreaterThan(xpThresholdForLevel(level - 1));
    }
  });

  it("clamps out-of-range levels", () => {
    expect(xpThresholdForLevel(-5)).toBe(0);
    expect(xpThresholdForLevel(0)).toBe(0);
    expect(xpThresholdForLevel(500)).toBe(MAX_XP);
    expect(xpThresholdForLevel(2.9)).toBe(xpThresholdForLevel(2));
  });
});

describe("calculateLevelProgress", () => {
  it("Level 1 exists with 0 XP", () => {
    expect(calculateLevelProgress(0)).toEqual({
      totalXp: 0,
      level: 1,
      currentLevelXp: 0,
      nextLevelXp: 100,
      xpRemaining: 100,
      progressPercent: 0,
    });
  });

  it("changes level exactly at each threshold (and not one XP before)", () => {
    for (let level = 2; level <= LEVEL_MAX; level++) {
      const threshold = xpThresholdForLevel(level);
      expect(calculateLevelProgress(threshold - 1).level).toBe(level - 1);
      expect(calculateLevelProgress(threshold).level).toBe(level);
    }
  });

  it("reports remaining XP and percent inside a level", () => {
    const p = calculateLevelProgress(150); // Level 2: 100 -> 283
    expect(p.level).toBe(2);
    expect(p.currentLevelXp).toBe(100);
    expect(p.nextLevelXp).toBe(283);
    expect(p.xpRemaining).toBe(133);
    expect(p.progressPercent).toBeCloseTo((50 / 183) * 100, 0);
  });

  it("handles Level 98 (last level with a next level)", () => {
    const start = xpThresholdForLevel(98);
    const p = calculateLevelProgress(start);
    expect(p.level).toBe(98);
    expect(p.nextLevelXp).toBe(MAX_XP);
    expect(p.xpRemaining).toBe(MAX_XP - start);
    expect(p.progressPercent).toBe(0);
    expect(calculateLevelProgress(MAX_XP - 1).level).toBe(98);
    expect(calculateLevelProgress(MAX_XP - 1).progressPercent).toBeLessThan(100);
  });

  it("handles Level 99 as the end of the line", () => {
    expect(calculateLevelProgress(MAX_XP)).toEqual({
      totalXp: MAX_XP,
      level: 99,
      currentLevelXp: MAX_XP,
      nextLevelXp: MAX_XP,
      xpRemaining: 0,
      progressPercent: 100,
    });
  });

  it("keeps Level 99 for XP above the maximum", () => {
    const p = calculateLevelProgress(MAX_XP * 10);
    expect(p.level).toBe(99);
    expect(p.xpRemaining).toBe(0);
    expect(p.progressPercent).toBe(100);
    expect(p.totalXp).toBe(MAX_XP * 10);
  });

  it("is safe with negative, fractional and non-finite XP", () => {
    expect(calculateLevelProgress(-50).level).toBe(1);
    expect(calculateLevelProgress(-50).totalXp).toBe(0);
    expect(calculateLevelProgress(100.9).totalXp).toBe(100);
    expect(calculateLevelProgress(Number.NaN).level).toBe(1);
    expect(calculateLevelProgress(Number.POSITIVE_INFINITY).level).toBe(99);
  });

  it("only shows 100% at the final level", () => {
    for (let level = 1; level < LEVEL_MAX; level++) {
      const justBefore = xpThresholdForLevel(level + 1) - 1;
      expect(calculateLevelProgress(justBefore).progressPercent).toBeLessThan(100);
    }
  });

  it("levelFromXp agrees with calculateLevelProgress", () => {
    for (const xp of [0, 1, 99, 100, 5_000, 40_000, MAX_XP]) {
      expect(levelFromXp(xp)).toBe(calculateLevelProgress(xp).level);
    }
  });
});

describe("getLevelTier", () => {
  it.each([
    [1, "Iniciante"],
    [5, "Iniciante"],
    [6, "Aventureiro"],
    [15, "Aventureiro"],
    [16, "Experiente"],
    [30, "Experiente"],
    [31, "Veterano"],
    [50, "Veterano"],
    [51, "Mestre"],
    [70, "Mestre"],
    [71, "Elite"],
    [90, "Elite"],
    [91, "Lendário"],
    [98, "Lendário"],
    [99, "Ascendente"],
  ])("level %i is %s", (level, tier) => {
    expect(getLevelTier(level)).toBe(tier);
  });
});
