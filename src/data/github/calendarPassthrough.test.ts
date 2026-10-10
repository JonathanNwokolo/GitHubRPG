// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildActivityFlame } from "@/features/activity-flame/buildActivityFlame";
import { normalizeDeveloperProfile } from "../normalize";
import { validateRawGitHubData } from "../schemas";
import { GitHubApiDataSource } from "./GitHubApiDataSource";
import { toYearDayCounts } from "./contributionStats";
import { createFakeGitHub, type FakeGitHubOptions } from "./testing/fakeGitHub";

const NOW = new Date("2026-10-05T12:00:00Z");

const PROFILE: FakeGitHubOptions = {
  login: "Octo-Dev",
  createdAt: "2025-08-20T10:00:00Z",
  followers: 7,
  repos: [{ name: "alpha", stars: 10, forks: 2, languages: { TypeScript: 8000 } }],
  days: { "2025-08-21": 3, "2025-09-01": 2, "2025-09-02": 1, "2026-01-01": 4, "2026-10-04": 5, "2026-10-05": 1 },
  years: {
    2025: { commits: 4, pullRequests: 1, issues: 2, reviews: 3 },
    2026: { commits: 5, pullRequests: 1, issues: 0, reviews: 0 },
  },
};

function source(options: FakeGitHubOptions, { anonymous = false } = {}) {
  const github = createFakeGitHub(options);
  return new GitHubApiDataSource({
    token: anonymous ? undefined : "ghp_test_token",
    fetch: github.fetch,
    now: () => NOW,
    sleep: async () => {},
    repositoryTransport: "rest",
  });
}

describe("toYearDayCounts", () => {
  const day = (date: string, count: number) => ({ date, count });

  it("is dense: index 0 is January 1st, absent days are 0, and it ends at December 31st for a finished year", () => {
    const counts = toYearDayCounts([day("2025-01-01", 2), day("2025-12-31", 7), day("2025-03-01", 1)], 2025, "2026-10-05");

    expect(counts).toHaveLength(365);
    expect(counts[0]).toBe(2);
    expect(counts[59]).toBe(1); // March 1st
    expect(counts[364]).toBe(7);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("ends at the reference day for the current year, dropping the padded week", () => {
    const counts = toYearDayCounts([day("2026-10-05", 4), day("2026-10-08", 9)], 2026, "2026-10-05T12:00:00Z");

    expect(counts).toHaveLength(278);
    expect(counts[277]).toBe(4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("covers leap years, sums duplicates and ignores days of other years", () => {
    const counts = toYearDayCounts([day("2024-02-29", 1), day("2024-02-29", 2), day("2023-12-31", 50)], 2024, "2026-10-05");

    expect(counts).toHaveLength(366);
    expect(counts[59]).toBe(3);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe("the per-day calendar already read from GitHub", () => {
  it("reaches RawGitHubData, validated, from the requests that were already made", async () => {
    const raw = await source(PROFILE).getProfile("octo-dev");
    const valid = validateRawGitHubData(raw);

    expect(valid.activity.calendar?.coverage).toBe("full");
    const years = valid.activity.calendar?.years ?? [];
    expect(years.map((entry) => entry.year)).toEqual([2025, 2026]);
    const y2025 = years[0].counts;
    expect(y2025).toHaveLength(365);
    expect(y2025[232]).toBe(3); // 2025-08-21
    expect(y2025.reduce((a, b) => a + b, 0)).toBe(6);
    const y2026 = years[1].counts;
    expect(y2026).toHaveLength(278);
    expect(y2026[0]).toBe(4);
    expect(y2026[276]).toBe(5);
    expect(y2026[277]).toBe(1);
  });

  it("agrees with the activity numbers computed from the same calendar", async () => {
    const raw = validateRawGitHubData(await source(PROFILE).getProfile("octo-dev"));
    const model = buildActivityFlame({
      calendar: raw.activity.calendar,
      createdAt: raw.createdAt,
      referenceDate: raw.fetchedAt,
    });
    const activeDays = model.years.reduce((total, entry) => total + entry.stats.activeDays, 0);
    const contributions = model.years.reduce((total, entry) => total + entry.stats.contributions, 0);

    expect(activeDays).toBe(raw.activity.activeDays.value);
    expect(contributions).toBe(raw.activity.yearly?.years.reduce((total, entry) => total + entry.contributions, 0));
    expect(model.years[1].stats.longestStreak).toMatchObject({ days: 2, exact: true });
  });

  it("stays out of the DeveloperProfile, so the engine and the V2 profile fingerprint never see it", async () => {
    const raw = validateRawGitHubData(await source(PROFILE).getProfile("octo-dev"));
    const profile = normalizeDeveloperProfile(raw);

    expect(JSON.stringify(profile)).not.toContain("calendar");
    expect(Object.keys(profile.activity)).not.toContain("calendar");
  });

  it("is unavailable, never zero, without a token (GraphQL is not available anonymously)", async () => {
    const raw = validateRawGitHubData(await source(PROFILE, { anonymous: true }).getProfile("octo-dev"));

    expect(raw.activity.calendar).toEqual({ years: [], coverage: "unavailable" });
    const model = buildActivityFlame({
      calendar: raw.activity.calendar,
      createdAt: raw.createdAt,
      referenceDate: raw.fetchedAt,
    });
    expect(model.coverage).toBe("unavailable");
    expect(model.years).toEqual([]);
  });

  it("rejects a malformed calendar instead of rendering it", () => {
    const valid = validateRawGitHubData({
      username: "x",
      createdAt: "2020-01-01T00:00:00Z",
      fetchedAt: "2026-10-01T00:00:00Z",
      isDemo: true,
      followers: { value: 0, coverage: "full" },
      commits: { value: 0, coverage: "full" },
      pullRequests: { value: 0, coverage: "full" },
      reviews: { value: 0, coverage: "full" },
      issues: { value: 0, coverage: "full" },
      repositories: { items: [], coverage: "full" },
      activity: {
        activeDays: { value: 0, coverage: "full" },
        longestStreakDays: { value: 0, coverage: "full" },
        currentStreakDays: { value: 0, coverage: "full" },
        recentActiveDays: { value: 0, coverage: "full" },
        monthlyContributions: { months: [0], coverage: "full" },
      },
    });
    expect(valid.activity.calendar).toBeUndefined();

    const withCalendar = (counts: unknown) => () =>
      validateRawGitHubData({
        ...valid,
        activity: { ...valid.activity, calendar: { years: [{ year: 2025, counts }], coverage: "full" } },
      });
    expect(withCalendar([0, 1, 2])).not.toThrow();
    expect(withCalendar([-1])).toThrow();
    expect(withCalendar([1.5])).toThrow();
    expect(withCalendar(new Array(400).fill(0))).toThrow();
  });
});
