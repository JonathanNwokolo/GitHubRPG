// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { RawGitHubData } from "../contracts";
import { RESERVED_PERSONAS } from "../personas";
import { validateRawGitHubData } from "../schemas";
import { MOCK_REFERENCE_DATE, generateDeterministicProfile, generateMockCalendar } from "./deterministicGenerator";

/** Contributions of the demo calendar per month, creation month first (the same shape as the monthly series). */
function monthlyFromCalendar(raw: RawGitHubData): number[] {
  const created = new Date(raw.createdAt);
  const months = raw.activity.monthlyContributions.months.length;
  const totals = new Array<number>(months).fill(0);
  for (const { year, counts } of raw.activity.calendar?.years ?? []) {
    counts.forEach((count, index) => {
      const date = new Date(Date.UTC(year, 0, 1 + index));
      const offset = (date.getUTCFullYear() - created.getUTCFullYear()) * 12 + date.getUTCMonth() - created.getUTCMonth();
      if (offset >= 0 && offset < months) totals[offset] += count;
    });
  }
  return totals;
}

describe("demo calendar", () => {
  it("is derived from the monthly series: every month sums back to exactly its value", () => {
    for (const username of ["john-doe", "ana-dev", "zeta", "octocat-99"]) {
      const raw = generateDeterministicProfile(username);
      expect(monthlyFromCalendar(raw)).toEqual(raw.activity.monthlyContributions.months);
    }
  });

  it("is deterministic and valid", () => {
    const a = generateDeterministicProfile("john-doe");
    const b = generateDeterministicProfile("john-doe");

    expect(a.activity.calendar).toEqual(b.activity.calendar);
    expect(a.activity.calendar?.coverage).toBe("full");
    expect(() => validateRawGitHubData(a)).not.toThrow();
  });

  it("covers every year of the account up to the mock reference date, never beyond", () => {
    const raw = generateDeterministicProfile("john-doe");
    const years = raw.activity.calendar?.years ?? [];
    const first = new Date(raw.createdAt).getUTCFullYear();

    expect(years[0].year).toBe(first);
    expect(years[years.length - 1].year).toBe(new Date(MOCK_REFERENCE_DATE).getUTCFullYear());
    // 2026-01-01 .. 2026-10-01
    expect(years[years.length - 1].counts).toHaveLength(274);
    for (const entry of years.slice(0, -1)) expect([365, 366]).toContain(entry.counts.length);
  });

  it("gives every reserved persona a valid calendar, and the empty one an all-zero calendar", () => {
    for (const [name, raw] of Object.entries(RESERVED_PERSONAS)) {
      expect(raw.activity.calendar, name).toBeDefined();
      expect(() => validateRawGitHubData(raw), name).not.toThrow();
    }
    const empty = RESERVED_PERSONAS["empty-dev"].activity.calendar;
    expect(empty?.years.flatMap((entry) => entry.counts).every((count) => count === 0)).toBe(true);
  });

  it("does not shift anything else the seed produces (own generator, own seed)", () => {
    const withCalendar = generateDeterministicProfile("john-doe");
    const calendar = generateMockCalendar("another-seed", [3, 0, 5], "2026-01-10T00:00:00Z", MOCK_REFERENCE_DATE);

    expect(calendar[0].counts.slice(0, 9).every((count) => count === 0)).toBe(true); // before creation
    expect(generateDeterministicProfile("john-doe")).toEqual(withCalendar);
  });
});
