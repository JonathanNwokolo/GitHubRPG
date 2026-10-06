// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RECENT_WINDOW_DAYS as ENGINE_RECENT_WINDOW_DAYS } from "@/game/constants";
import { RECENT_WINDOW_DAYS } from "./limits";
import {
  computeCurrentStreak,
  computeLongestStreak,
  findLongestStreakPeriod,
  summarizeActivity,
  summarizeYearDays,
  toDayNumber,
  type ContributionDay,
} from "./contributionStats";

const day = (date: string, count = 1): ContributionDay => ({ date, count });
const nums = (...dates: string[]) => dates.map(toDayNumber);

describe("recent window", () => {
  it("mirrors the engine constant", () => {
    expect(RECENT_WINDOW_DAYS).toBe(ENGINE_RECENT_WINDOW_DAYS);
  });
});

describe("computeLongestStreak", () => {
  it("is 0 with no active day", () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it("is 1 with a single day", () => {
    expect(computeLongestStreak(nums("2024-05-10"))).toBe(1);
  });

  it("counts a continuous run", () => {
    expect(computeLongestStreak(nums("2024-05-01", "2024-05-02", "2024-05-03", "2024-05-04"))).toBe(4);
  });

  it("breaks the run on a gap", () => {
    expect(computeLongestStreak(nums("2024-05-01", "2024-05-02", "2024-05-04", "2024-05-05"))).toBe(2);
  });

  it("returns the longest of several runs", () => {
    const dates = nums("2024-01-01", "2024-01-02", "2024-02-10", "2024-02-11", "2024-02-12", "2024-03-01");
    expect(computeLongestStreak(dates)).toBe(3);
  });

  it("continues across the new year", () => {
    expect(computeLongestStreak(nums("2023-12-30", "2023-12-31", "2024-01-01", "2024-01-02"))).toBe(4);
  });

  it("handles leap days", () => {
    expect(computeLongestStreak(nums("2024-02-28", "2024-02-29", "2024-03-01"))).toBe(3);
  });
});

describe("computeCurrentStreak", () => {
  const today = toDayNumber("2024-06-10");

  it("is 0 with no activity", () => {
    expect(computeCurrentStreak([], today)).toBe(0);
  });

  it("counts a streak that includes today", () => {
    expect(computeCurrentStreak(nums("2024-06-08", "2024-06-09", "2024-06-10"), today)).toBe(3);
  });

  it("keeps the streak alive when today has no contribution yet but yesterday had", () => {
    expect(computeCurrentStreak(nums("2024-06-08", "2024-06-09"), today)).toBe(2);
  });

  it("is 0 once a whole day was missed", () => {
    expect(computeCurrentStreak(nums("2024-06-07", "2024-06-08"), today)).toBe(0);
  });

  it("crosses the new year", () => {
    expect(computeCurrentStreak(nums("2023-12-31", "2024-01-01"), toDayNumber("2024-01-01"))).toBe(2);
  });
});

describe("summarizeActivity", () => {
  const options = { createdAt: "2023-11-15T08:00:00Z", referenceDate: "2024-02-20T10:00:00Z", recentWindowDays: 365 };

  it("returns zeros and a monthly series of the right length for an empty history", () => {
    const summary = summarizeActivity([], options);
    expect(summary).toMatchObject({ activeDays: 0, longestStreakDays: 0, currentStreakDays: 0, recentActiveDays: 0 });
    // Nov, Dec, Jan, Feb
    expect(summary.monthlyContributions).toEqual([0, 0, 0, 0]);
  });

  it("sums contributions per month, creation month to reference month", () => {
    const summary = summarizeActivity(
      [day("2023-11-16", 3), day("2023-11-17", 2), day("2023-12-31", 4), day("2024-01-01", 1), day("2024-02-19", 7)],
      options
    );
    expect(summary.monthlyContributions).toEqual([5, 4, 1, 7]);
    expect(summary.activeDays).toBe(5);
    expect(summary.longestStreakDays).toBe(2); // Dec 31 + Jan 1
    expect(summary.currentStreakDays).toBe(1); // Feb 19, Feb 20 still open
  });

  it("ignores zero-count days and future days, and counts a duplicated date once", () => {
    const summary = summarizeActivity(
      [day("2024-02-01", 0), day("2024-02-02", 2), day("2024-02-02", 3), day("2024-02-25", 9)],
      options
    );
    expect(summary.activeDays).toBe(1);
    expect(summary.monthlyContributions[3]).toBe(5);
  });

  it("limits recentActiveDays to the last 365 days (inclusive of the reference day)", () => {
    const longOptions = { createdAt: "2020-01-01T00:00:00Z", referenceDate: "2024-02-20T00:00:00Z", recentWindowDays: 365 };
    const inside = "2023-02-21"; // exactly 365 days ending 2024-02-20
    const outside = "2023-02-20";
    const summary = summarizeActivity([day(inside), day(outside), day("2024-02-20")], longOptions);
    expect(summary.activeDays).toBe(3);
    expect(summary.recentActiveDays).toBe(2);
  });

  it("rejects malformed dates instead of guessing", () => {
    expect(() => summarizeActivity([day("20240101")], options)).toThrow();
  });
});

describe("findLongestStreakPeriod", () => {
  const REF = "2026-10-05T00:00:00Z";

  it("is null with no active day", () => {
    expect(findLongestStreakPeriod([], REF)).toBeNull();
    expect(findLongestStreakPeriod([day("2024-05-01", 0)], REF)).toBeNull();
  });

  it("returns where the longest run started and ended", () => {
    const days = ["2024-01-01", "2024-01-02", "2024-02-10", "2024-02-11", "2024-02-12", "2024-03-01"].map((d) => day(d));
    expect(findLongestStreakPeriod(days, REF)).toEqual({ start: "2024-02-10", end: "2024-02-12", length: 3 });
  });

  it("crosses the new year and leap days", () => {
    const days = ["2023-12-30", "2023-12-31", "2024-01-01"].map((d) => day(d));
    expect(findLongestStreakPeriod(days, REF)).toEqual({ start: "2023-12-30", end: "2024-01-01", length: 3 });
    const leap = ["2024-02-28", "2024-02-29", "2024-03-01"].map((d) => day(d));
    expect(findLongestStreakPeriod(leap, REF)?.length).toBe(3);
  });

  it("on a tie keeps the EARLIEST run, like computeLongestStreak measures", () => {
    const days = ["2025-09-01", "2025-09-02", "2026-10-04", "2026-10-05"].map((d) => day(d));
    expect(findLongestStreakPeriod(days, REF)).toEqual({ start: "2025-09-01", end: "2025-09-02", length: 2 });
  });

  it("ignores days after the reference date and duplicated dates", () => {
    const days = [day("2026-10-05"), day("2026-10-05", 4), day("2026-10-06"), day("2026-10-07")];
    expect(findLongestStreakPeriod(days, REF)).toEqual({ start: "2026-10-05", end: "2026-10-05", length: 1 });
  });

  it("always agrees with computeLongestStreak on the length", () => {
    const dates = ["2024-01-01", "2024-01-02", "2024-02-10", "2024-02-11", "2024-02-12", "2024-02-14", "2024-02-15"];
    const days = dates.map((d) => day(d));
    expect(findLongestStreakPeriod(days, REF)?.length).toBe(computeLongestStreak(nums(...dates)));
  });
});

describe("summarizeYearDays", () => {
  it("sums one year's calendar and counts its active days", () => {
    expect(summarizeYearDays([day("2024-01-01", 3), day("2024-01-02", 0), day("2024-05-05", 2)], "2024-12-31T00:00:00Z")).toEqual({
      contributions: 5,
      activeDays: 2,
    });
  });

  it("ignores the padded days after the reference date (current year)", () => {
    expect(summarizeYearDays([day("2026-10-04", 5), day("2026-10-05", 1), day("2026-10-06", 9)], "2026-10-05T12:00:00Z")).toEqual({
      contributions: 6,
      activeDays: 2,
    });
  });

  it("counts a duplicated date once as an active day but sums its contributions", () => {
    expect(summarizeYearDays([day("2024-05-05", 2), day("2024-05-05", 3)], "2024-12-31T00:00:00Z")).toEqual({
      contributions: 5,
      activeDays: 1,
    });
  });
});
