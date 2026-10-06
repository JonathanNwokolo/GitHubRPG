import type { DataCoverage, DeveloperProfile } from "@/game/types";

/** What is known about one calendar year. Breakdown figures are null when the source has only a monthly series. */
export interface YearStats {
  year: number;
  contributions: number;
  commits: number | null;
  pullRequests: number | null;
  reviews: number | null;
  issues: number | null;
  activeDays: number | null;
  /** "partial": the figures are lower bounds (only a partial monthly series). */
  coverage: "full" | "partial";
}

export interface YearHistory {
  /** Calendar years from the creation year to the reference year, ascending. */
  accountYears: number[];
  /** Only the years that could be read. An absent year is UNKNOWN, never zero. */
  stats: ReadonlyMap<number, YearStats>;
  /** unavailable: no yearly history; partial: some account years are unknown or lower bounds. */
  coverage: DataCoverage;
}

const yearOf = (iso: string): number => new Date(iso).getUTCFullYear();

function accountYears(createdAt: string, referenceDate: string): number[] {
  const first = yearOf(createdAt);
  const last = Math.max(first, yearOf(referenceDate));
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** Contributions per calendar year from the monthly series (month 0 = the creation month). */
function yearsFromMonthly(profile: DeveloperProfile, coverage: "full" | "partial"): Map<number, YearStats> {
  const created = new Date(profile.accountCreatedAt);
  const createdYear = created.getUTCFullYear();
  const createdMonth = created.getUTCMonth();
  const stats = new Map<number, YearStats>();
  profile.activity.monthlyContributions.forEach((count, index) => {
    const year = createdYear + Math.floor((createdMonth + index) / 12);
    const existing = stats.get(year);
    if (existing) {
      existing.contributions += count;
    } else {
      stats.set(year, { year, contributions: count, commits: null, pullRequests: null, reviews: null, issues: null, activeDays: null, coverage });
    }
  });
  return stats;
}

/**
 * The yearly history of a profile, from the best source it has:
 * 1. `activity.yearly` (real GitHub: exact per-year commits, PRs, reviews, issues, active days);
 * 2. the monthly series (mock data: contributions only);
 * 3. nothing -> coverage "unavailable".
 */
export function collectYearHistory(profile: DeveloperProfile): YearHistory {
  const years = accountYears(profile.accountCreatedAt, profile.referenceDate);
  const inRange = new Set(years);
  const yearly = profile.activity.yearly;

  let stats = new Map<number, YearStats>();
  let sourceCoverage: DataCoverage = "unavailable";

  if (yearly && yearly.coverage !== "unavailable") {
    for (const item of yearly.years) {
      if (!inRange.has(item.year)) continue;
      stats.set(item.year, { ...item, coverage: "full" });
    }
    sourceCoverage = yearly.coverage;
  } else if (profile.activity.monthlyCoverage !== "unavailable") {
    stats = yearsFromMonthly(profile, profile.activity.monthlyCoverage);
    for (const year of [...stats.keys()]) if (!inRange.has(year)) stats.delete(year);
    sourceCoverage = profile.activity.monthlyCoverage;
  }

  if (sourceCoverage === "unavailable" || stats.size === 0) return { accountYears: years, stats: new Map(), coverage: "unavailable" };

  // Complete only when the source says so AND it really covers every year of the account.
  const everyYearRead = years.every((year) => stats.has(year));
  return { accountYears: years, stats, coverage: sourceCoverage === "full" && everyYearRead ? "full" : "partial" };
}
