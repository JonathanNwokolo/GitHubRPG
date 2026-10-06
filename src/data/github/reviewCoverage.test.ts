// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizeDeveloperProfile } from "../normalize";
import { validateRawGitHubData } from "../schemas";
import { GitHubApiDataSource } from "./GitHubApiDataSource";
import type { ContributionHistory, YearContributions } from "./contributions";
import { GitHubDataValidationError, GitHubUnavailableError } from "./errors";
import { assessReviews } from "./reviewCoverage";
import { createFakeGitHub, type FakeGitHubOptions } from "./testing/fakeGitHub";

const NOW = new Date("2026-10-05T12:00:00Z");
const TOKEN = "ghp_test_token";

function setup(fake: FakeGitHubOptions = {}, token: string | null = TOKEN) {
  const github = createFakeGitHub({ login: "octo-dev", repos: [], ...fake });
  const source = new GitHubApiDataSource({ token: token ?? undefined, fetch: github.fetch, now: () => NOW, sleep: async () => {} });
  return { github, source };
}

const year = (y: number, reviews: number): YearContributions => ({ year: y, commits: 0, pullRequests: 0, issues: 0, reviews, days: [] });
const history = (years: YearContributions[], missingYears: number[] = []): ContributionHistory => ({
  years,
  missingYears,
  complete: missingYears.length === 0,
});

describe("assessReviews (pure)", () => {
  it("sums the years and keeps the per-year breakdown, years without reviews included", () => {
    const result = assessReviews(history([year(2022, 4), year(2023, 0), year(2024, 10), year(2025, 3), year(2026, 1)]));
    expect(result.metric).toEqual({ value: 18, coverage: "full" });
    expect(result.reason).toBe("all-years-read");
    expect(result.byYear.map((item) => item.reviews)).toEqual([4, 0, 10, 3, 1]);
    expect(result.metric.value).toBe(result.byYear.reduce((sum, item) => sum + item.reviews, 0));
  });

  it("zero reviews in every year is a real zero, still full", () => {
    expect(assessReviews(history([year(2025, 0), year(2026, 0)])).metric).toEqual({ value: 0, coverage: "full" });
  });

  it("sparse years (reviews only in some, a long gap between) are full when every year was read", () => {
    const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].map((y) => year(y, y === 2018 ? 7 : y === 2024 ? 2 : 0));
    expect(assessReviews(history(years)).metric).toEqual({ value: 9, coverage: "full" });
  });

  it("a year that was not read makes the value a lower bound (partial)", () => {
    const result = assessReviews(history([year(2025, 5), year(2026, 2)], [2000, 2001]));
    expect(result.metric).toEqual({ value: 7, coverage: "partial" });
    expect(result.reason).toBe("years-not-read");
    expect(result.missingYears).toEqual([2000, 2001]);
  });

  it("without GraphQL history the metric does not exist (unavailable, null, never 0)", () => {
    const result = assessReviews(null);
    expect(result.metric).toEqual({ value: null, coverage: "unavailable" });
    expect(result.reason).toBe("no-token");
    expect(result.byYear).toEqual([]);
  });
});

describe("reviews through GitHubApiDataSource (fake GitHub, offline)", () => {
  it("reviews per year: only the review total of each year, summed across years", async () => {
    const { source } = setup({
      createdAt: "2022-03-01T00:00:00Z",
      years: {
        2022: { commits: 100, pullRequests: 20, issues: 10, reviews: 3 },
        2023: { commits: 100, pullRequests: 20, issues: 10, reviews: 0 },
        2024: { commits: 1, pullRequests: 1, issues: 1, reviews: 12 },
        2026: { commits: 0, pullRequests: 0, issues: 0, reviews: 5 },
      },
    });
    const raw = await source.getProfile("octo-dev");
    // Not mixed with commits, pull requests or issues, and 2025 (no data at all) simply adds 0.
    expect(raw.reviews).toEqual({ value: 20, coverage: "full" });
    expect(raw.pullRequests.value).toBe(41);
    expect(raw.issues.value).toBe(21);
  });

  it("requests every calendar year since creation, one disjoint window of at most one year each", async () => {
    const { source, github } = setup({ createdAt: "2022-03-01T00:00:00Z", years: { 2022: { reviews: 1 } } });
    await source.getProfile("octo-dev");

    const query = github.calls.find((call) => call.graphqlQuery?.includes("contributionsCollection"))?.graphqlQuery ?? "";
    const windows = [...query.matchAll(/y(\d{4}): contributionsCollection\(from: "([^"]+)", to: "([^"]+)"\)/g)].map((m) => ({
      year: Number(m[1]),
      from: m[2],
      to: m[3],
    }));
    expect(windows.map((w) => w.year).sort()).toEqual([2022, 2023, 2024, 2025, 2026]);
    for (const { year: y, from, to } of windows) {
      expect(from).toBe(`${y}-01-01T00:00:00Z`);
      expect(to).toBe(y === 2026 ? NOW.toISOString() : `${y}-12-31T23:59:59Z`);
      expect(Date.parse(to) - Date.parse(from)).toBeLessThanOrEqual(366 * 86_400_000);
    }
    expect(query).toContain("totalPullRequestReviewContributions");
    expect(query).not.toContain("contributionYears"); // never relied upon
  });

  it("zero reviews: full with 0, not unavailable", async () => {
    const { source } = setup({ createdAt: "2025-01-01T00:00:00Z", years: { 2025: { commits: 9 } } });
    expect((await source.getProfile("octo-dev")).reviews).toEqual({ value: 0, coverage: "full" });
  });

  it("a year without reviews between years with reviews does not break the sum", async () => {
    const { source } = setup({ createdAt: "2019-01-01T00:00:00Z", years: { 2019: { reviews: 2 }, 2026: { reviews: 3 } } });
    expect((await source.getProfile("octo-dev")).reviews).toEqual({ value: 5, coverage: "full" });
  });

  it("sparse years: a review-only year GraphQL might not list is still read", async () => {
    // The fake no longer answers contributionYears at all: every year since creation is asked for.
    const { source } = setup({ createdAt: "2017-06-01T00:00:00Z", years: { 2018: { reviews: 40 } } });
    expect((await source.getProfile("octo-dev")).reviews).toEqual({ value: 40, coverage: "full" });
  });

  it("an account older than the year cap is partial: the oldest years are not read and the value is a lower bound", async () => {
    const { source, github } = setup({ createdAt: "2000-02-01T00:00:00Z", years: { 2026: { reviews: 6 }, 2000: { reviews: 99 } } });
    const raw = await source.getProfile("octo-dev");
    expect(raw.reviews).toEqual({ value: 6, coverage: "partial" });
    expect(raw.commits.coverage).toBe("partial");
    const contributionRequests = github.calls.filter((c) => c.graphqlQuery?.includes("contributionsCollection"));
    expect(contributionRequests).toHaveLength(5); // 25 years read, 5 per request
  });

  it("no token: reviews are unavailable (null), nothing is invented", async () => {
    const { source, github } = setup({ createdAt: "2020-01-01T00:00:00Z", years: { 2024: { reviews: 50 } } }, null);
    const raw = await source.getProfile("octo-dev");
    expect(raw.reviews).toEqual({ value: null, coverage: "unavailable" });
    expect(github.count("graphql")).toBe(0);
  });

  it("a GraphQL error is an error, never a silently partial or zero review count", async () => {
    const { source, github } = setup({ createdAt: "2024-01-01T00:00:00Z", years: { 2024: { reviews: 4 } } });
    github.overrides.push((call) =>
      call.graphqlQuery?.includes("contributionsCollection")
        ? new Response(JSON.stringify({ data: null, errors: [{ type: "INTERNAL", message: "boom" }] }), { status: 200 })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubUnavailableError);
  });

  it("a year missing from a GraphQL answer is rejected, not read as zero", async () => {
    const { source, github } = setup({ createdAt: "2024-01-01T00:00:00Z", years: { 2024: { reviews: 4 } } });
    github.overrides.push((call) =>
      call.graphqlQuery?.includes("contributionsCollection")
        ? new Response(JSON.stringify({ data: { user: { y2026: { totalCommitContributions: 0 } } } }), { status: 200 })
        : undefined
    );
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubDataValidationError);
  });

  it("a review total that is not a count is rejected", async () => {
    const { source, github } = setup({ createdAt: "2026-01-01T00:00:00Z" });
    github.overrides.push((call) => {
      if (!call.graphqlQuery?.includes("contributionsCollection")) return undefined;
      const bad = {
        totalCommitContributions: 0,
        totalIssueContributions: 0,
        totalPullRequestContributions: 0,
        totalPullRequestReviewContributions: -3,
        contributionCalendar: { weeks: [] },
      };
      return new Response(JSON.stringify({ data: { user: { y2026: bad } } }), { status: 200 });
    });
    await expect(source.getProfile("octo-dev")).rejects.toBeInstanceOf(GitHubDataValidationError);
  });

  it("the coverage survives normalization (full, partial and unavailable reach the engine's input)", async () => {
    const full = await setup({ createdAt: "2025-01-01T00:00:00Z", years: { 2025: { reviews: 8 } } }).source.getProfile("octo-dev");
    expect(normalizeDeveloperProfile(validateRawGitHubData(full)).reviews).toEqual({ value: 8, coverage: "full" });

    const partial = await setup({ createdAt: "2000-02-01T00:00:00Z", years: { 2026: { reviews: 8 } } }).source.getProfile("octo-dev");
    expect(normalizeDeveloperProfile(validateRawGitHubData(partial)).reviews).toEqual({ value: 8, coverage: "partial" });

    const none = await setup({ createdAt: "2025-01-01T00:00:00Z" }, null).source.getProfile("octo-dev");
    expect(normalizeDeveloperProfile(validateRawGitHubData(none)).reviews).toEqual({ value: 0, coverage: "unavailable" });
  });
});
