import { describe, expect, it } from "vitest";
import { IMPACT_WEIGHTS, PROGRESSION_CURVE_EXPONENT, XP_WEIGHTS } from "../constants";
import { m, makeAverageProfile, makeMaxedProfile, makeProfile } from "@/test/builders";
import { MAX_XP } from "./level";
import {
  calculateProgressionScore,
  calculateTotalXp,
  curveProgression,
  xpFromProgressionScore,
} from "./xp";

describe("XP", () => {
  it("is zero for an empty profile", () => {
    const profile = makeProfile();
    expect(calculateProgressionScore(profile)).toBe(0);
    expect(calculateTotalXp(profile)).toBe(0);
  });

  it("gives a beginner a small but non-zero amount", () => {
    const beginner = makeProfile({
      commits: m(42),
      pullRequests: m(1),
      issues: m(1),
      ownRepositories: m(2),
      starsReceived: m(3),
    });
    const xp = calculateTotalXp(beginner);
    expect(xp).toBeGreaterThan(0);
    expect(xp).toBeLessThan(calculateTotalXp(makeAverageProfile()));
  });

  it("gives an average user clearly more than a beginner and clearly less than the cap", () => {
    const xp = calculateTotalXp(makeAverageProfile());
    expect(xp).toBeGreaterThan(10_000);
    expect(xp).toBeLessThan(MAX_XP);
  });

  it("caps at the XP of Level 99 for enormous values (diminishing returns + clamp)", () => {
    expect(calculateProgressionScore(makeMaxedProfile())).toBe(1);
    expect(calculateTotalXp(makeMaxedProfile())).toBe(MAX_XP);
  });

  it("never goes negative nor above the cap for hostile input", () => {
    const hostile = makeProfile({ commits: m(-500), pullRequests: m(Number.NaN), issues: m(Infinity) });
    const xp = calculateTotalXp(hostile);
    expect(xp).toBeGreaterThanOrEqual(0);
    expect(xp).toBeLessThanOrEqual(MAX_XP);
  });

  it("has diminishing returns: the same +100 commits are worth less the more you already have", () => {
    // measured in score space so the early-game curve does not mask the effect
    const gainOf100 = (from: number) =>
      calculateProgressionScore(makeProfile({ commits: m(from + 100) })) -
      calculateProgressionScore(makeProfile({ commits: m(from) }));
    expect(gainOf100(0)).toBeGreaterThan(gainOf100(500));
    expect(gainOf100(500)).toBeGreaterThan(gainOf100(5_000));
    expect(gainOf100(5_000)).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const profile = makeAverageProfile();
    expect(calculateTotalXp(profile)).toBe(calculateTotalXp(structuredClone(profile)));
  });

  it("does not give XP for followers", () => {
    const base = makeAverageProfile({ followers: m(0) });
    const famous = makeAverageProfile({ followers: m(1_000_000) });
    expect(calculateTotalXp(famous)).toBe(calculateTotalXp(base));
  });

  it("gives stars and forks only a very small impact", () => {
    const base = makeAverageProfile({ starsReceived: m(0), forksReceived: m(0) });
    const viral = makeAverageProfile({ starsReceived: m(5_000), forksReceived: m(1_000) });
    const delta = calculateProgressionScore(viral) - calculateProgressionScore(base);
    expect(delta).toBeLessThanOrEqual(XP_WEIGHTS.impact + 1e-9);
  });

  it("weights sum to 1 and no single indicator exceeds 40%", () => {
    const weights = Object.values(XP_WEIGHTS);
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Math.max(...weights)).toBeLessThanOrEqual(0.4);
    expect(IMPACT_WEIGHTS.stars + IMPACT_WEIGHTS.forks).toBeCloseTo(1, 10);
  });

  it("a single indicator alone can never exceed 40% of the progression score", () => {
    const onlyCommits = makeProfile({ commits: m(1_000_000_000) });
    expect(calculateProgressionScore(onlyCommits)).toBeLessThanOrEqual(0.4 + 1e-9);
  });

  it("applies the early-game curve (score^2.5)", () => {
    expect(PROGRESSION_CURVE_EXPONENT).toBe(2.5);
    expect(curveProgression(0.5)).toBeCloseTo(0.5 ** 2.5, 10);
    expect(curveProgression(0.5)).toBeLessThan(0.5);
    expect(curveProgression(2)).toBe(1);
    expect(curveProgression(-1)).toBe(0);
    expect(xpFromProgressionScore(1)).toBe(MAX_XP);
  });
});
