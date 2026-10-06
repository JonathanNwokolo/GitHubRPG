import type { DataCoverage, DeveloperProfile, LanguageUsage, Metric } from "@/game/types";
import type { RawGitHubData, RawMetric } from "./contracts";

function toMetric(raw: RawMetric): Metric {
  if (raw.coverage === "unavailable" || raw.value === null) {
    return { value: 0, coverage: "unavailable" };
  }
  return { value: Math.max(0, Math.floor(raw.value)), coverage: raw.coverage };
}

/** A figure derived from the repository list is only as complete as that list. */
function derived(value: number, coverage: DataCoverage): Metric {
  return coverage === "unavailable" ? { value: 0, coverage } : { value, coverage };
}

/** The weakest of two coverages: unavailable < partial < full. */
function weakest(a: DataCoverage, b: DataCoverage): DataCoverage {
  if (a === "unavailable" || b === "unavailable") return "unavailable";
  return a === "partial" || b === "partial" ? "partial" : "full";
}

function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Only absolute https URLs are kept; anything else makes the UI use its fallback avatar. */
function optionalHttpsUrl(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).protocol === "https:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * RawGitHubData (already validated) -> DeveloperProfile, the only shape the engine reads.
 * Pure: no dates, no randomness. Forks are excluded from every repository-derived number.
 */
export function normalizeDeveloperProfile(raw: RawGitHubData): DeveloperProfile {
  const repoCoverage = raw.repositories.coverage;
  const ownRepos = raw.repositories.items.filter((r) => !r.isFork);

  let stars = 0;
  let forks = 0;
  let starred = 0;
  const bytesByLanguage = new Map<string, number>();
  const reposByLanguage = new Map<string, number>();

  for (const repo of ownRepos) {
    stars += repo.stars;
    forks += repo.forks;
    if (repo.stars > 0) starred++;
    for (const [language, bytes] of Object.entries(repo.languages)) {
      if (bytes <= 0) continue;
      bytesByLanguage.set(language, (bytesByLanguage.get(language) ?? 0) + bytes);
      reposByLanguage.set(language, (reposByLanguage.get(language) ?? 0) + 1);
    }
  }

  // Languages can never be more complete than the repository list they come from.
  const languagesCoverage = weakest(repoCoverage, raw.languagesCoverage ?? repoCoverage);

  const languages: LanguageUsage[] =
    languagesCoverage === "unavailable"
      ? []
      : [...bytesByLanguage.entries()].map(([name, bytes]) => ({
          name,
          bytes,
          repoCount: reposByLanguage.get(name) ?? 0,
        }));

  const monthly = raw.activity.monthlyContributions;
  const yearly = raw.activity.yearly;

  return {
    username: raw.username.trim(),
    displayName: optionalText(raw.displayName),
    avatarUrl: optionalHttpsUrl(raw.avatarUrl),
    bio: optionalText(raw.bio),
    location: optionalText(raw.location),
    company: optionalText(raw.company),
    accountCreatedAt: raw.createdAt,
    referenceDate: raw.fetchedAt,
    isDemo: raw.isDemo,

    commits: toMetric(raw.commits),
    pullRequests: toMetric(raw.pullRequests),
    reviews: toMetric(raw.reviews),
    issues: toMetric(raw.issues),
    followers: toMetric(raw.followers),

    ownRepositories: derived(ownRepos.length, repoCoverage),
    starsReceived: derived(stars, repoCoverage),
    forksReceived: derived(forks, repoCoverage),
    starredRepositories: derived(starred, repoCoverage),
    languages,
    languagesCoverage,

    activity: {
      activeDays: toMetric(raw.activity.activeDays),
      longestStreakDays: toMetric(raw.activity.longestStreakDays),
      currentStreakDays: toMetric(raw.activity.currentStreakDays),
      recentActiveDays: toMetric(raw.activity.recentActiveDays),
      monthlyContributions: monthly.coverage === "unavailable" ? [] : [...monthly.months],
      monthlyCoverage: monthly.coverage,
      ...(yearly && {
        yearly: {
          years: yearly.coverage === "unavailable" ? [] : yearly.years.map((year) => ({ ...year })),
          coverage: yearly.coverage,
        },
      }),
      ...(raw.activity.longestStreakPeriod !== undefined && {
        longestStreakPeriod: raw.activity.longestStreakPeriod && { ...raw.activity.longestStreakPeriod },
      }),
    },
  };
}
