import { describe, expect, it } from "vitest";
import { calculateAccountAge } from "../age";
import { STAT_WEIGHTS } from "../constants";
import { analyzeLanguages } from "../languages";
import {
  analysisFromShares,
  m,
  makeAverageProfile,
  makeMaxedProfile,
  makeProfile,
} from "@/test/builders";
import {
  calculateActivity,
  calculateConsistency,
  calculateExperience,
  calculateReputation,
  calculateStats,
  calculateVersatility,
  temporalDistribution,
} from "./calculateAttributes";

const ageOf = (profile = makeProfile()) => calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
const statsOf = (profile = makeProfile()) =>
  calculateStats(profile, analyzeLanguages(profile.languages), ageOf(profile));

describe("stats bounds", () => {
  it("are all 0 for an empty profile", () => {
    const empty = makeProfile({ accountCreatedAt: "2026-01-01T00:00:00Z" });
    expect(statsOf(empty)).toEqual({ activity: 0, experience: 0, reputation: 0, versatility: 0, consistency: 0 });
  });

  it("are reasonable for a normal profile", () => {
    const stats = statsOf(makeAverageProfile());
    for (const value of Object.values(stats)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(100);
    }
  });

  it("stay within 0-100 integers for extreme values", () => {
    const maxed = makeMaxedProfile();
    const stats = calculateStats(
      { ...maxed, languages: [{ name: "A", bytes: 1e12, repoCount: 1e9 }] },
      analyzeLanguages(maxed.languages),
      ageOf(maxed)
    );
    for (const value of Object.values(stats)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(stats.activity).toBe(100);
    expect(stats.reputation).toBe(100);
  });

  it("stay within 0-100 for hostile values", () => {
    const hostile = makeProfile({ commits: m(-1), followers: m(Number.NaN), starsReceived: m(Infinity) });
    for (const value of Object.values(statsOf(hostile))) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe("Activity", () => {
  it("grows with lifetime volume", () => {
    const low = calculateActivity(makeProfile({ commits: m(100) }));
    const high = calculateActivity(makeProfile({ commits: m(5_000) }));
    expect(high).toBeGreaterThan(low);
  });

  it("recent activity complements history but never replaces it", () => {
    const recentOnly = calculateActivity(
      makeProfile({ activity: { ...makeProfile().activity, recentActiveDays: m(365) } })
    );
    expect(recentOnly).toBeLessThanOrEqual(10);

    const history = makeAverageProfile();
    const withRecent = makeAverageProfile({ activity: { ...history.activity, recentActiveDays: m(200) } });
    expect(calculateActivity(withRecent)).toBeGreaterThanOrEqual(calculateActivity(history));
    expect(calculateActivity(withRecent)).toBeLessThan(calculateActivity(history) + 11);
  });
});

describe("Experience", () => {
  it("uses the V1.1 weights (age 20 / repos 25 / PRs 25 / reviews 20 / issues 10) and they sum to 100%", () => {
    const w = STAT_WEIGHTS.experience;
    expect(w).toEqual({ accountAge: 0.2, repositories: 0.25, pullRequests: 0.25, reviews: 0.2, issues: 0.1 });
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("account age alone can never reach 100 (nor even 20)", () => {
    const ancient = makeProfile({ accountCreatedAt: "1990-01-01T00:00:00Z" });
    expect(calculateExperience(ancient, ageOf(ancient))).toBeLessThanOrEqual(20);
  });

  it("stays inside 0-100 for empty, average and maxed profiles", () => {
    for (const profile of [makeProfile(), makeAverageProfile(), makeMaxedProfile()]) {
      const value = calculateExperience(profile, ageOf(profile));
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("collaboration (PRs + reviews) now drives Experience", () => {
    const base = makeProfile({ accountCreatedAt: "2026-01-01T00:00:00Z" });
    const withCollaboration = makeProfile({
      accountCreatedAt: "2026-01-01T00:00:00Z",
      pullRequests: m(300),
      reviews: m(300),
    });
    expect(calculateExperience(withCollaboration, ageOf(withCollaboration))).toBeGreaterThan(
      calculateExperience(base, ageOf(base)) + 30
    );
  });

  it("combines age with real participation", () => {
    const young = makeAverageProfile({ accountCreatedAt: "2025-10-01T00:00:00Z" });
    const old = makeAverageProfile({ accountCreatedAt: "2015-10-01T00:00:00Z" });
    expect(calculateExperience(old, ageOf(old))).toBeGreaterThan(calculateExperience(young, ageOf(young)));
  });
});

describe("Reputation", () => {
  it("uses stars, forks, followers and starred repositories", () => {
    const base = makeProfile();
    expect(calculateReputation(makeProfile({ followers: m(500) }))).toBeGreaterThan(calculateReputation(base));
    expect(calculateReputation(makeProfile({ starsReceived: m(500) }))).toBeGreaterThan(calculateReputation(base));
    expect(calculateReputation(makeProfile({ forksReceived: m(100) }))).toBeGreaterThan(calculateReputation(base));
    expect(calculateReputation(makeProfile({ starredRepositories: m(10) }))).toBeGreaterThan(calculateReputation(base));
  });
});

describe("Versatility", () => {
  it("TS 96 / CSS 2 / HTML 1 / Shell 1 is low and 40/30/20/10 is much higher", () => {
    const monoculture = calculateVersatility(analysisFromShares({ TypeScript: 96, CSS: 2, HTML: 1, Shell: 1 }));
    const balanced = calculateVersatility(analysisFromShares({ TypeScript: 40, Python: 30, Go: 20, CSS: 10 }));
    expect(monoculture).toBeLessThan(15);
    expect(balanced).toBeGreaterThan(monoculture * 3);
  });

  it("counts only relevant languages (>= 5%)", () => {
    const withNoise = calculateVersatility(analysisFromShares({ TypeScript: 90, A: 2, B: 2, C: 2, D: 2, E: 2 }));
    const clean = calculateVersatility(analysisFromShares({ TypeScript: 100 }));
    expect(withNoise).toBe(clean);
  });

  it("treats exactly 5% as relevant", () => {
    const four = calculateVersatility(analysisFromShares({ A: 85, B: 5, C: 5, D: 5 }));
    const justBelow = calculateVersatility(analysisFromShares({ A: 85, B: 5, C: 5, D: 4, E: 1 }));
    expect(four).toBeGreaterThan(justBelow);
  });

  it("rewards more balanced languages and is 0 with none", () => {
    const two = calculateVersatility(analysisFromShares({ A: 50, B: 50 }));
    const four = calculateVersatility(analysisFromShares({ A: 25, B: 25, C: 25, D: 25 }));
    const eight = calculateVersatility(
      analysisFromShares({ A: 12.5, B: 12.5, C: 12.5, D: 12.5, E: 12.5, F: 12.5, G: 12.5, H: 12.5 })
    );
    expect(four).toBeGreaterThan(two);
    expect(eight).toBeGreaterThan(four);
    expect(eight).toBe(100);
    expect(calculateVersatility(analysisFromShares({}))).toBe(0);
  });
});

describe("Consistency", () => {
  const steady = Array.from({ length: 36 }, () => 10);
  const bursty = [...Array.from({ length: 35 }, () => 0), 360]; // same 360 contributions, one burst

  it("favors regularity over a single burst with the same total", () => {
    expect(temporalDistribution(steady)).toBeGreaterThan(temporalDistribution(bursty) * 10);
    const base = makeProfile().activity;
    const steadyScore = calculateConsistency(makeProfile({ activity: { ...base, monthlyContributions: steady } }));
    const burstScore = calculateConsistency(makeProfile({ activity: { ...base, monthlyContributions: bursty } }));
    expect(steadyScore).toBeGreaterThan(burstScore);
  });

  it("temporal distribution is 0 without data and 1-ish for steady mature history", () => {
    expect(temporalDistribution([])).toBe(0);
    expect(temporalDistribution([0, 0, 0])).toBe(0);
    expect(temporalDistribution(steady)).toBeCloseTo(1, 10);
  });

  it("a very young account is not 'perfectly regular'", () => {
    expect(temporalDistribution([5, 5])).toBeLessThan(temporalDistribution(steady));
  });

  it("uses active days, streak and recent days too", () => {
    const base = makeProfile().activity;
    const better = calculateConsistency(
      makeProfile({
        activity: {
          ...base,
          activeDays: m(500),
          longestStreakDays: m(60),
          recentActiveDays: m(100),
          monthlyContributions: steady,
        },
      })
    );
    expect(better).toBeGreaterThan(calculateConsistency(makeProfile({ activity: { ...base, monthlyContributions: steady } })));
  });
});
