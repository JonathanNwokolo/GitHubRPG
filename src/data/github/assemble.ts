import type { RawGitHubData, RawMetric } from "../contracts";
import type { RestUser } from "./apiSchemas";
import type { ContributionHistory } from "./contributions";
import { summarizeActivity, type ContributionDay } from "./contributionStats";
import { RECENT_WINDOW_DAYS } from "./limits";
import { assessReviews } from "./reviewCoverage";
import type { RepositoryData } from "./restFetchers";

const UNAVAILABLE: RawMetric = { value: null, coverage: "unavailable" };

function metric(value: number, complete: boolean): RawMetric {
  return { value, coverage: complete ? "full" : "partial" };
}

/**
 * What the system calls each number (see GITHUB_API_INTEGRATION.md):
 * - commits / pullRequests / issues / reviews: PUBLIC contributions as GitHub counts them
 *   (contributionsCollection totals), summed over every year of the account, never double counted
 *   (reviews: see reviewCoverage.ts for their own coverage rule);
 * - activity: from the contribution calendar (every contribution type, plus private ones only if the
 *   user chose to show them on their profile, as GitHub exposes them).
 *
 * `history` is null when no token is configured (GraphQL is unavailable anonymously):
 * every contribution-derived metric is then "unavailable", never guessed.
 */
export function assembleRawProfile(input: {
  user: RestUser;
  repositories: RepositoryData;
  history: ContributionHistory | null;
  fetchedAt: Date;
}): RawGitHubData {
  const { user, repositories, history } = input;
  const createdAt = new Date(user.created_at).toISOString();
  // Clock skew between this server and GitHub must never produce a profile "from the future".
  const fetchedAt = new Date(Math.max(input.fetchedAt.getTime(), Date.parse(createdAt))).toISOString();

  const base = {
    username: user.login,
    displayName: user.name ?? null,
    bio: user.bio ?? null,
    location: user.location ?? null,
    company: user.company ?? null,
    createdAt,
    fetchedAt,
    isDemo: false,
    followers: metric(user.followers, true),
    repositories: { items: repositories.items, coverage: repositories.coverage },
    languagesCoverage: repositories.languagesCoverage,
  };

  if (history === null) {
    return {
      ...base,
      commits: UNAVAILABLE,
      pullRequests: UNAVAILABLE,
      reviews: UNAVAILABLE,
      issues: UNAVAILABLE,
      activity: {
        activeDays: UNAVAILABLE,
        longestStreakDays: UNAVAILABLE,
        currentStreakDays: UNAVAILABLE,
        recentActiveDays: UNAVAILABLE,
        monthlyContributions: { months: [], coverage: "unavailable" },
      },
    };
  }

  const sum = (pick: (year: ContributionHistory["years"][number]) => number) =>
    history.years.reduce((total, year) => total + pick(year), 0);

  const days: ContributionDay[] = history.years.flatMap((year) => year.days);
  const summary = summarizeActivity(days, { createdAt, referenceDate: fetchedAt, recentWindowDays: RECENT_WINDOW_DAYS });
  const complete = history.complete;

  return {
    ...base,
    commits: metric(sum((y) => y.commits), complete),
    pullRequests: metric(sum((y) => y.pullRequests), complete),
    reviews: assessReviews(history).metric,
    issues: metric(sum((y) => y.issues), complete),
    activity: {
      activeDays: metric(summary.activeDays, complete),
      longestStreakDays: metric(summary.longestStreakDays, complete),
      currentStreakDays: metric(summary.currentStreakDays, complete),
      recentActiveDays: metric(summary.recentActiveDays, true),
      monthlyContributions: { months: summary.monthlyContributions, coverage: complete ? "full" : "partial" },
    },
  };
}
