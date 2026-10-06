import type { DataCoverage, DeveloperProfile, Metric, YearActivity } from "@/game/types";
import { makeProfile, m } from "@/test/builders";

/**
 * Test-only builders for the Chronicle. They produce plain DeveloperProfiles with a yearly history;
 * they are NOT personas and are never reachable from the UI or from the data sources.
 */

/** Shorthand: `n` contributions with a plausible, deterministic breakdown. */
export function year(n: number): Omit<YearActivity, "year"> {
  return {
    contributions: n,
    commits: Math.round(n * 0.6),
    pullRequests: Math.round(n * 0.1),
    reviews: Math.round(n * 0.05),
    issues: Math.round(n * 0.02),
    activeDays: Math.min(365, Math.round(n / 4)),
  };
}

export type YearSpec = number | Partial<Omit<YearActivity, "year">>;

export interface ChronicleProfileOptions {
  createdAt: string;
  referenceDate: string;
  /** Calendar year -> contributions (shorthand) or explicit figures. Years of the account that are left out are zero-filled unless `omitYears`. */
  years: Record<number, YearSpec>;
  /** Account years to leave OUT of the history entirely (unread, not zero). */
  omitYears?: number[];
  yearlyCoverage?: DataCoverage;
  longestStreak?: { start: string; end: string; days: number; coverage?: DataCoverage };
  overrides?: Partial<DeveloperProfile>;
}

const ZERO = { contributions: 0, commits: 0, pullRequests: 0, reviews: 0, issues: 0, activeDays: 0 };

export function yearlyProfile(options: ChronicleProfileOptions): DeveloperProfile {
  const first = Number(options.createdAt.slice(0, 4));
  const last = Number(options.referenceDate.slice(0, 4));
  const omitted = new Set(options.omitYears ?? []);

  const years: YearActivity[] = [];
  for (let y = first; y <= last; y++) {
    if (omitted.has(y)) continue;
    const spec = options.years[y];
    const figures = typeof spec === "number" ? year(spec) : { ...ZERO, ...spec };
    years.push({ year: y, ...figures });
  }

  const streak = options.longestStreak;
  const streakMetric: Metric = streak ? m(streak.days, streak.coverage ?? "full") : m(0);
  return makeProfile({
    accountCreatedAt: options.createdAt,
    referenceDate: options.referenceDate,
    username: "chronicle-test",
    activity: {
      activeDays: m(0),
      longestStreakDays: streakMetric,
      currentStreakDays: m(0),
      recentActiveDays: m(0),
      monthlyContributions: [],
      monthlyCoverage: "full",
      yearly: { years, coverage: options.yearlyCoverage ?? "full" },
      longestStreakPeriod: streak ? { start: streak.start, end: streak.end } : null,
    },
    ...options.overrides,
  });
}

/** A profile that only has the monthly series (what the mock sources provide). */
export function monthlyProfile(createdAt: string, referenceDate: string, months: number[], coverage: DataCoverage = "full"): DeveloperProfile {
  return makeProfile({
    accountCreatedAt: createdAt,
    referenceDate,
    username: "chronicle-test",
    activity: {
      activeDays: m(0),
      longestStreakDays: m(0),
      currentStreakDays: m(0),
      recentActiveDays: m(0),
      monthlyContributions: months,
      monthlyCoverage: coverage,
    },
  });
}

/** No contribution history at all (no token): only the creation date is known. */
export function noHistoryProfile(createdAt: string, referenceDate: string): DeveloperProfile {
  return makeProfile({
    accountCreatedAt: createdAt,
    referenceDate,
    username: "chronicle-test",
    commits: { value: 0, coverage: "unavailable" },
    activity: {
      activeDays: { value: 0, coverage: "unavailable" },
      longestStreakDays: { value: 0, coverage: "unavailable" },
      currentStreakDays: { value: 0, coverage: "unavailable" },
      recentActiveDays: { value: 0, coverage: "unavailable" },
      monthlyContributions: [],
      monthlyCoverage: "unavailable",
      yearly: { years: [], coverage: "unavailable" },
      longestStreakPeriod: null,
    },
  });
}
