import { describe, expect, it } from "vitest";
import { makeAverageProfile, m } from "@/test/builders";
import { assessCharacterCalculationCoverage } from "./coverage";

describe("character calculation coverage", () => {
  it("distinguishes a real zero from an unavailable normalized zero", () => {
    const real = assessCharacterCalculationCoverage(makeAverageProfile({ commits: m(0, "full") }));
    const missing = assessCharacterCalculationCoverage(makeAverageProfile({ commits: m(0, "unavailable") }));
    expect(real.xpLevel).toBe("complete");
    expect(missing.xpLevel).toBe("partial");
    expect(missing.unavailableMetrics).toContain("commits");
  });

  it("marks a fully covered character complete", () => {
    const coverage = assessCharacterCalculationCoverage(makeAverageProfile());
    expect(coverage.status).toBe("complete");
    expect(coverage.affectedValues).toEqual([]);
    expect(coverage.duel.comparable).toBe(true);
    expect(coverage.hall.sortable).toBe(true);
    expect(coverage.sharing.calculatedNumbersPublishable).toBe(true);
  });

  it("keeps independent attributes publishable on a partial sheet", () => {
    const profile = makeAverageProfile({
      commits: m(0, "unavailable"), pullRequests: m(0, "unavailable"), reviews: m(0, "unavailable"), issues: m(0, "unavailable"),
      activity: { ...makeAverageProfile().activity, activeDays: m(0, "unavailable"), longestStreakDays: m(0, "unavailable"), recentActiveDays: m(0, "unavailable"), monthlyContributions: [], monthlyCoverage: "unavailable" },
    });
    const coverage = assessCharacterCalculationCoverage(profile);
    expect(coverage.status).toBe("partial");
    expect(coverage.contributions).toBe("unavailable");
    expect(coverage.xpLevel).toBe("partial");
    expect(coverage.attributes.reputation).toBe("complete");
    expect(coverage.attributes.versatility).toBe("complete");
    expect(coverage.duel.comparable).toBe(false);
    expect(coverage.hall.sortable).toBe(false);
    expect(coverage.sharing.calculatedNumbersPublishable).toBe(false);
  });

  it("marks lower-bound inputs as partial without changing their values", () => {
    const coverage = assessCharacterCalculationCoverage(makeAverageProfile({ commits: m(25, "partial") }));
    expect(coverage.status).toBe("partial");
    expect(coverage.contributions).toBe("partial");
    expect(coverage.xpLevel).toBe("partial");
  });

  it("marks the calculation unavailable when none of its inputs are observed", () => {
    const unavailable = m(0, "unavailable");
    const base = makeAverageProfile();
    const coverage = assessCharacterCalculationCoverage(makeAverageProfile({
      commits: unavailable,
      pullRequests: unavailable,
      reviews: unavailable,
      issues: unavailable,
      followers: unavailable,
      ownRepositories: unavailable,
      starsReceived: unavailable,
      forksReceived: unavailable,
      starredRepositories: unavailable,
      languages: [],
      languagesCoverage: "unavailable",
      activity: {
        ...base.activity,
        activeDays: unavailable,
        longestStreakDays: unavailable,
        recentActiveDays: unavailable,
        monthlyContributions: [],
        monthlyCoverage: "unavailable",
      },
    }));
    expect(coverage.status).toBe("unavailable");
    expect(coverage.xpLevel).toBe("unavailable");
    expect(Object.values(coverage.attributes).every((value) => value === "unavailable")).toBe(true);
  });
});
