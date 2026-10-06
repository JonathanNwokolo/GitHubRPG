import { describe, expect, it } from "vitest";
import { calculateAccountAge } from "./age";

describe("calculateAccountAge", () => {
  it("does not count a year just because the calendar year changed", () => {
    // Created in December: in January of the 5th calendar year it still has only 4 years.
    const age = calculateAccountAge("2021-12-15T00:00:00Z", "2026-01-10T00:00:00Z");
    expect(age.wholeYears).toBe(4);
    expect(age.years).toBeGreaterThan(4);
    expect(age.years).toBeLessThan(5);
  });

  it("completes the year exactly on the anniversary", () => {
    expect(calculateAccountAge("2021-12-15T10:00:00Z", "2026-12-15T10:00:00Z").wholeYears).toBe(5);
    expect(calculateAccountAge("2021-12-15T10:00:00Z", "2026-12-15T10:00:00Z").years).toBe(5);
  });

  it("is still short one second before the anniversary", () => {
    const age = calculateAccountAge("2021-12-15T10:00:00Z", "2026-12-15T09:59:59Z");
    expect(age.wholeYears).toBe(4);
    expect(age.years).toBeLessThan(5);
  });

  it("handles the same calendar year (account younger than a year)", () => {
    const age = calculateAccountAge("2026-03-01T00:00:00Z", "2026-09-01T00:00:00Z");
    expect(age.wholeYears).toBe(0);
    expect(age.years).toBeCloseTo(184 / 365, 2);
  });

  it("handles leap-day accounts without throwing or going backwards", () => {
    const before = calculateAccountAge("2020-02-29T00:00:00Z", "2025-02-28T00:00:00Z");
    const after = calculateAccountAge("2020-02-29T00:00:00Z", "2025-03-01T00:00:00Z");
    expect(before.wholeYears).toBe(4);
    expect(after.wholeYears).toBe(5);
  });

  it("returns 0 for a reference before creation or invalid dates", () => {
    expect(calculateAccountAge("2026-01-01T00:00:00Z", "2025-01-01T00:00:00Z")).toEqual({ wholeYears: 0, years: 0 });
    expect(calculateAccountAge("garbage", "2025-01-01T00:00:00Z")).toEqual({ wholeYears: 0, years: 0 });
  });

  it("reports an 11-year account as 11.x", () => {
    const age = calculateAccountAge("2015-05-20T08:00:00Z", "2026-10-01T00:00:00Z");
    expect(age.wholeYears).toBe(11);
    expect(age.years).toBeCloseTo(11.37, 1);
  });

  it("is deterministic", () => {
    const a = calculateAccountAge("2018-06-01T00:00:00Z", "2026-01-01T00:00:00Z");
    const b = calculateAccountAge("2018-06-01T00:00:00Z", "2026-01-01T00:00:00Z");
    expect(a).toEqual(b);
  });
});
