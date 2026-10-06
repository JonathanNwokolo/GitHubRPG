import type { RawGitHubData, RawMetric } from "@/data/contracts";
import { analyzeLanguages, type LanguageAnalysis } from "@/game/languages";
import type { DataCoverage, DeveloperProfile, LanguageUsage, Metric } from "@/game/types";

export const REFERENCE_DATE = "2026-01-01T00:00:00Z";

export function m(value: number, coverage: DataCoverage = "full"): Metric {
  return { value, coverage };
}

export function rawMetric(value: number | null, coverage: DataCoverage = "full"): RawMetric {
  return { value, coverage };
}

/** A fully-covered profile with every counter at zero. Override only what a test cares about. */
export function makeProfile(overrides: Partial<DeveloperProfile> = {}): DeveloperProfile {
  return {
    username: "test-user",
    accountCreatedAt: "2025-12-20T00:00:00Z",
    referenceDate: REFERENCE_DATE,
    isDemo: true,
    commits: m(0),
    pullRequests: m(0),
    reviews: m(0),
    issues: m(0),
    followers: m(0),
    ownRepositories: m(0),
    starsReceived: m(0),
    forksReceived: m(0),
    starredRepositories: m(0),
    languages: [],
    languagesCoverage: "full",
    activity: {
      activeDays: m(0),
      longestStreakDays: m(0),
      currentStreakDays: m(0),
      recentActiveDays: m(0),
      monthlyContributions: [],
      monthlyCoverage: "full",
    },
    ...overrides,
  };
}

/** A mid-career profile used by several tests. */
export function makeAverageProfile(overrides: Partial<DeveloperProfile> = {}): DeveloperProfile {
  return makeProfile({
    accountCreatedAt: "2021-03-10T00:00:00Z",
    commits: m(1_000),
    pullRequests: m(50),
    reviews: m(20),
    issues: m(30),
    followers: m(40),
    ownRepositories: m(30),
    starsReceived: m(100),
    forksReceived: m(20),
    starredRepositories: m(8),
    languages: languagesFromShares({ TypeScript: 55, Python: 25, CSS: 12, Shell: 8 }, 6),
    activity: {
      activeDays: m(400),
      longestStreakDays: m(20),
      currentStreakDays: m(4),
      recentActiveDays: m(90),
      monthlyContributions: Array.from({ length: 48 }, (_, i) => (i % 5 === 0 ? 0 : 20 + (i % 7))),
      monthlyCoverage: "full",
    },
    ...overrides,
  });
}

/** A profile with every counter far above every reference value. */
export function makeMaxedProfile(): DeveloperProfile {
  const huge = 1_000_000_000;
  return makeProfile({
    accountCreatedAt: "2008-01-01T00:00:00Z",
    commits: m(huge),
    pullRequests: m(huge),
    reviews: m(huge),
    issues: m(huge),
    followers: m(huge),
    ownRepositories: m(huge),
    starsReceived: m(huge),
    forksReceived: m(huge),
    starredRepositories: m(huge),
    activity: {
      activeDays: m(huge),
      longestStreakDays: m(huge),
      currentStreakDays: m(huge),
      recentActiveDays: m(huge),
      monthlyContributions: Array.from({ length: 200 }, () => 100),
      monthlyCoverage: "full",
    },
  });
}

/** Language usage from percentages: bytes = percent * 1000, `repoCount` repos each. */
export function languagesFromShares(shares: Record<string, number>, repoCount = 5): LanguageUsage[] {
  return Object.entries(shares).map(([name, percent]) => ({
    name,
    bytes: percent * 1_000,
    repoCount,
  }));
}

export function analysisFromShares(shares: Record<string, number>, repoCount = 5): LanguageAnalysis {
  return analyzeLanguages(languagesFromShares(shares, repoCount));
}

/** A valid RawGitHubData with no activity; override what a test needs. */
export function makeRawData(overrides: Partial<RawGitHubData> = {}): RawGitHubData {
  return {
    username: "raw-user",
    displayName: null,
    bio: null,
    location: null,
    company: null,
    createdAt: "2020-01-01T00:00:00Z",
    fetchedAt: REFERENCE_DATE,
    isDemo: true,
    followers: rawMetric(0),
    commits: rawMetric(0),
    pullRequests: rawMetric(0),
    reviews: rawMetric(0),
    issues: rawMetric(0),
    repositories: { items: [], coverage: "full" },
    activity: {
      activeDays: rawMetric(0),
      longestStreakDays: rawMetric(0),
      currentStreakDays: rawMetric(0),
      recentActiveDays: rawMetric(0),
      monthlyContributions: { months: [], coverage: "full" },
    },
    ...overrides,
  };
}
