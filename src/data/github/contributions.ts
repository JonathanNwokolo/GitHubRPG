import { z } from "zod";
import { mapWithConcurrency } from "./concurrency";
import { GitHubDataValidationError } from "./errors";
import { contributionCollectionSchema, parsePayload } from "./apiSchemas";
import type { ContributionDay } from "./contributionStats";
import type { GitHubHttpClient, RequestContext } from "./httpClient";
import {
  CONTRIBUTION_REQUEST_CONCURRENCY,
  CONTRIBUTION_YEARS_PER_REQUEST,
  MAX_CONTRIBUTION_YEARS,
} from "./limits";

export interface YearContributions {
  year: number;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  days: ContributionDay[];
}

export interface ContributionHistory {
  years: YearContributions[];
  /**
   * Calendar years between the account's creation year and the current one that were NOT read
   * (only possible beyond MAX_CONTRIBUTION_YEARS). Empty = every year of the account was read.
   */
  missingYears: number[];
  /** missingYears.length === 0. */
  complete: boolean;
}

const COLLECTION_FIELDS = `
  totalCommitContributions
  totalIssueContributions
  totalPullRequestContributions
  totalPullRequestReviewContributions
  contributionCalendar { weeks { contributionDays { date contributionCount } } }`;

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new GitHubDataValidationError("contribution year");
}

/** `to` for a year: the end of the year, or `now` for the current one. Years are validated integers, so inlining is safe. */
export function yearRange(year: number, now: Date): { from: string; to: string } {
  const from = `${year}-01-01T00:00:00Z`;
  const to = year >= now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
  return { from, to };
}

/** One GraphQL request for several years at once (aliased contributionsCollection, max 1 year each). */
export function buildContributionsQuery(years: readonly number[], now: Date): string {
  const aliases = years
    .map((year) => {
      assertYear(year);
      const { from, to } = yearRange(year, now);
      return `y${year}: contributionsCollection(from: "${from}", to: "${to}") { ${COLLECTION_FIELDS} }`;
    })
    .join("\n");
  return `query ($login: String!) { user(login: $login) { ${aliases} } }`;
}

const yearsResponseSchema = z.object({ user: z.record(z.string(), z.unknown()) });

function toYearContributions(year: number, collection: unknown): YearContributions {
  const parsed = parsePayload(contributionCollectionSchema, collection, `contributions ${year}`);
  const days = new Map<string, number>();
  for (const week of parsed.contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      // A year's calendar is padded to whole weeks: keep only days that belong to this year.
      if (day.date.startsWith(`${year}-`)) days.set(day.date, day.contributionCount);
    }
  }
  return {
    year,
    commits: parsed.totalCommitContributions,
    pullRequests: parsed.totalPullRequestContributions,
    issues: parsed.totalIssueContributions,
    reviews: parsed.totalPullRequestReviewContributions,
    days: [...days.entries()].map(([date, count]) => ({ date, count })),
  };
}

function readYears(data: unknown, years: readonly number[]): YearContributions[] {
  const user = parsePayload(yearsResponseSchema, data, "contributions").user;
  return years.map((year) => {
    if (!(`y${year}` in user)) throw new GitHubDataValidationError(`contributions ${year}`);
    return toYearContributions(year, user[`y${year}`]);
  });
}

/**
 * Whole public contribution history, year by year, de-duplicated by construction
 * (disjoint year ranges, each calendar filtered to its own year).
 *
 * EVERY calendar year from the account's creation year to the current one is requested, newest first.
 * GraphQL's `contributionYears` is deliberately not consulted: it was observed to list every year since
 * creation (empty ones included), so it adds nothing, and "full" must not depend on a list we do not control
 * (see "Code Review coverage validation" in GITHUB_API_INTEGRATION.md).
 *
 * Requests: ceil(years / 5), at most CONTRIBUTION_REQUEST_CONCURRENCY in flight.
 * Requires a token (GraphQL is not available anonymously).
 */
export async function fetchContributionHistory(
  client: GitHubHttpClient,
  login: string,
  createdAt: string,
  now: Date,
  ctx: RequestContext
): Promise<ContributionHistory> {
  const createdYear = Number(createdAt.slice(0, 4));
  const currentYear = now.getUTCFullYear();
  const accountYears = Array.from({ length: Math.max(0, currentYear - createdYear + 1) }, (_, i) => currentYear - i);
  const readable = accountYears.slice(0, MAX_CONTRIBUTION_YEARS);
  const missingYears = accountYears.slice(MAX_CONTRIBUTION_YEARS).sort((a, b) => a - b);

  const batches: number[][] = [];
  for (let i = 0; i < readable.length; i += CONTRIBUTION_YEARS_PER_REQUEST) {
    batches.push(readable.slice(i, i + CONTRIBUTION_YEARS_PER_REQUEST));
  }

  const results = await mapWithConcurrency(batches, CONTRIBUTION_REQUEST_CONCURRENCY, async (batch) => {
    const data = await client.graphql(buildContributionsQuery(batch, now), { login }, ctx);
    return readYears(data, batch);
  });

  const years = results.flat().sort((a, b) => a.year - b.year);
  return { years, missingYears, complete: missingYears.length === 0 };
}
