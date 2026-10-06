import type { RawMetric } from "../contracts";
import type { ContributionHistory } from "./contributions";

/**
 * Where `reviews` comes from and when it may be called "full".
 * Evidence and limits: "Code Review coverage validation" in GITHUB_API_INTEGRATION.md.
 *
 * A review is one `totalPullRequestReviewContributions` of a one-year `contributionsCollection`:
 * a public pull request the user submitted a review on, counted once per PR inside that window
 * (never comments on a PR or an issue, never PRs the user opened, never review requests received).
 * The metric is the sum over every calendar year of the account.
 */

/**
 * The earliest review contribution observed over 47 public profiles (heavy reviewers of Node.js, React,
 * Rails, ...) is 2016-09-14, when GitHub introduced pull request reviews. Zeros before it are real, not gaps.
 */
export const PULL_REQUEST_REVIEWS_LAUNCH_DATE = "2016-09-14";

export type ReviewCoverageReason =
  /** No token: GraphQL is not available anonymously, so the number does not exist. */
  | "no-token"
  /** Some calendar year of the account was not read: the value is a lower bound. */
  | "years-not-read"
  /** Every calendar year from the creation of the account to now was read. */
  | "all-years-read";

export interface ReviewYear {
  year: number;
  reviews: number;
}

export interface ReviewAssessment {
  metric: RawMetric;
  reason: ReviewCoverageReason;
  /** Ascending, one entry per year that was read (years with no review included, with 0). */
  byYear: ReviewYear[];
  /** Years of the account that were not read. */
  missingYears: number[];
}

/**
 * `full`        every calendar year of the account was read, one disjoint window each;
 * `partial`     some year was not read: the sum is "at least";
 * `unavailable` no token.
 *
 * A failing request never lands in `partial`: errors propagate (see "Erros"), so a profile is either
 * fully read or an error, never silently half-read.
 */
export function assessReviews(history: ContributionHistory | null): ReviewAssessment {
  if (history === null) {
    return { metric: { value: null, coverage: "unavailable" }, reason: "no-token", byYear: [], missingYears: [] };
  }
  const byYear = history.years.map(({ year, reviews }) => ({ year, reviews }));
  const total = byYear.reduce((sum, item) => sum + item.reviews, 0);
  const complete = history.missingYears.length === 0;
  return {
    metric: { value: total, coverage: complete ? "full" : "partial" },
    reason: complete ? "all-years-read" : "years-not-read",
    byYear,
    missingYears: [...history.missingYears],
  };
}
