// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildActivityFlame, flameLevel } from "./buildActivityFlame";
import { CREATED_LONG_AGO, REFERENCE, calendarOf, dayCounts, flatYear, sparseYear } from "./testing/fixtures";

const build = (calendar: ReturnType<typeof calendarOf> | null | undefined, createdAt = CREATED_LONG_AGO) =>
  buildActivityFlame({ calendar, createdAt, referenceDate: REFERENCE });

const yearOf = (model: ReturnType<typeof build>, year: number) => {
  const found = model.years.find((entry) => entry.year === year);
  if (!found) throw new Error(`year ${year} is not in the model`);
  return found;
};

describe("buildActivityFlame: no calendar", () => {
  it("is unavailable, empty and never invents a year when the calendar is missing", () => {
    for (const calendar of [undefined, null, { years: [], coverage: "unavailable" as const }]) {
      const model = build(calendar);
      expect(model.coverage).toBe("unavailable");
      expect(model.years).toEqual([]);
      expect(model.defaultYear).toBeNull();
      expect(model.totalContributions).toBe(0);
    }
  });

  it("keeps a calendar in which nothing was ever lit as real, empty years", () => {
    const model = build(calendarOf({ 2025: flatYear(2025, 0), 2026: flatYear(2026, 0, "2026-10-09") }));

    expect(model.coverage).toBe("full");
    expect(model.totalContributions).toBe(0);
    expect(model.years.map((entry) => entry.year)).toEqual([2025, 2026]);
    const last = yearOf(model, 2026);
    expect(last.stats).toMatchObject({ contributions: 0, activeDays: 0, longestStreak: null });
    expect(last.records).toEqual({ longestStreak: null, bestDay: null, bestWeek: null, bestMonth: null });
    expect(last.insight).toEqual({ id: "dormant" });
  });
});

describe("buildActivityFlame: one year", () => {
  // Created 2026-03-10 (a Tuesday). Active: Mar 10-14 (5 days), Apr 1, and a burst on Sat Apr 11 (12).
  const entries = {
    "2026-03-10": 2,
    "2026-03-11": 3,
    "2026-03-12": 1,
    "2026-03-13": 4,
    "2026-03-14": 2,
    "2026-04-01": 1,
    "2026-04-11": 12,
  };
  const model = build(calendarOf({ 2026: sparseYear(2026, entries, "2026-10-09") }), "2026-03-10T08:00:00Z");
  const year = yearOf(model, 2026);

  it("describes the single year and defaults to it", () => {
    expect(model.defaultYear).toBe(2026);
    expect(model.totalContributions).toBe(25);
    expect(year.inProgress).toBe(true);
    expect(year.counts).toHaveLength(282); // Jan 1 .. Oct 9
    expect(year.firstDayIndex).toBe(68); // March 10th: days before it are "before the journey"
  });

  it("computes the year totals", () => {
    expect(year.stats.contributions).toBe(25);
    expect(year.stats.activeDays).toBe(7);
    expect(year.stats.longestStreak).toEqual({ start: "2026-03-10", end: "2026-03-14", days: 5, exact: true });
  });

  it("has no streak alive when neither today nor yesterday was active", () => {
    expect(year.stats.endStreak).toEqual({ days: 0, exact: true });
  });

  it("computes the records from the same calendar", () => {
    expect(year.records.bestDay).toEqual({ date: "2026-04-11", count: 12 });
    // Calendar weeks run Sunday to Saturday: Apr 5-11 holds the 12; Mar 8-14 holds 12 too (earliest wins the tie).
    expect(year.records.bestWeek).toEqual({ start: "2026-03-08", end: "2026-03-14", count: 12 });
    expect(year.records.bestMonth).toEqual({ month: 4, count: 13 });
    expect(year.records.longestStreak).toEqual(year.stats.longestStreak);
  });
});

describe("buildActivityFlame: several years", () => {
  it("lists years ascending, newest as default, each with its own stats", () => {
    const model = build(
      calendarOf({
        2026: flatYear(2026, 1, "2026-10-09"),
        2024: flatYear(2024, 2),
        2025: flatYear(2025, 0),
      })
    );

    expect(model.years.map((entry) => entry.year)).toEqual([2024, 2025, 2026]);
    expect(model.defaultYear).toBe(2026);
    expect(yearOf(model, 2024).stats.contributions).toBe(732);
    expect(yearOf(model, 2025).stats.contributions).toBe(0);
    expect(yearOf(model, 2026).stats.contributions).toBe(282);
    expect(model.totalContributions).toBe(732 + 282);
    expect(yearOf(model, 2024).counts).toHaveLength(366);
    expect(yearOf(model, 2024).inProgress).toBe(false);
  });

  it("counts a streak across the new year in the year that holds it, up to that year's last day", () => {
    const model = build(
      calendarOf({
        2024: sparseYear(2024, { "2024-12-28": 1, "2024-12-29": 1, "2024-12-30": 1, "2024-12-31": 1 }),
        2025: sparseYear(2025, { "2025-01-01": 1, "2025-01-02": 1, "2025-01-03": 1 }),
      })
    );

    expect(yearOf(model, 2024).stats.longestStreak).toEqual({ start: "2024-12-28", end: "2024-12-31", days: 4, exact: true });
    expect(yearOf(model, 2025).stats.longestStreak).toEqual({ start: "2024-12-28", end: "2025-01-03", days: 7, exact: true });
    // The streak alive on December 31st is read up to that day, not into the next year.
    expect(yearOf(model, 2024).stats.endStreak).toEqual({ days: 4, exact: true });
  });

  it("keeps a streak alive through yesterday for the year in progress", () => {
    const alive = build(
      calendarOf({ 2026: sparseYear(2026, { "2026-10-06": 1, "2026-10-07": 1, "2026-10-08": 1 }, "2026-10-09") })
    );
    expect(yearOf(alive, 2026).stats.endStreak.days).toBe(3);

    const today = build(
      calendarOf({ 2026: sparseYear(2026, { "2026-10-06": 1, "2026-10-07": 1, "2026-10-08": 1, "2026-10-09": 2 }, "2026-10-09") })
    );
    expect(yearOf(today, 2026).stats.endStreak.days).toBe(4);

    const broken = build(calendarOf({ 2026: sparseYear(2026, { "2026-10-05": 1, "2026-10-06": 1 }, "2026-10-09") }));
    expect(yearOf(broken, 2026).stats.endStreak.days).toBe(0);
  });

  it("breaks ties on the longest streak toward the earliest run", () => {
    const model = build(
      calendarOf({
        2025: sparseYear(2025, {
          "2025-02-01": 1, "2025-02-02": 1, "2025-02-03": 1,
          "2025-06-01": 1, "2025-06-02": 1, "2025-06-03": 1,
        }),
      })
    );
    expect(yearOf(model, 2025).stats.longestStreak?.start).toBe("2025-02-01");
  });
});

describe("buildActivityFlame: partial history", () => {
  it("marks a streak that starts at an unread boundary as a lower bound, never exact", () => {
    // 2024 was not read. The run starts on 2025-01-01, so it may have started in the missing year.
    const model = build(
      calendarOf(
        {
          2023: sparseYear(2023, { "2023-05-01": 1, "2023-05-02": 1 }),
          2025: sparseYear(2025, { "2025-01-01": 1, "2025-01-02": 1, "2025-03-10": 1 }),
        },
        "partial"
      )
    );

    expect(model.coverage).toBe("partial");
    expect(model.years.map((entry) => entry.year)).toEqual([2023, 2025]);
    expect(yearOf(model, 2025).stats.longestStreak).toMatchObject({ days: 2, exact: false });
    expect(yearOf(model, 2023).stats.longestStreak).toMatchObject({ days: 2, exact: true });
  });

  it("treats January 1st of the account's first year as exact: nothing existed before it", () => {
    const model = build(
      calendarOf({ 2024: sparseYear(2024, { "2024-01-01": 1, "2024-01-02": 1 }) }),
      "2024-01-01T00:00:00Z"
    );
    expect(yearOf(model, 2024).stats.longestStreak).toMatchObject({ days: 2, exact: true });
  });
});

describe("flameLevel", () => {
  it("is 0 only without contributions and rises monotonically", () => {
    const cutoffs = [1, 3, 6, 12];
    expect(flameLevel(0, cutoffs)).toBe(0);
    const levels = [1, 2, 3, 5, 6, 8, 12, 13, 40].map((count) => flameLevel(count, cutoffs));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(levels[0]).toBe(1);
    expect(levels[levels.length - 1]).toBe(5);
  });

  it("never lights a high level for a handful of contributions, even on a quiet profile", () => {
    // Every active day has 1-2 contributions: percentiles alone would call a 2 "legendary".
    const model = build(calendarOf({ 2025: dayCounts(2025, null, (_, __, i) => (i % 5 === 0 ? 1 + (i % 2) : 0)) }));
    const max = Math.max(...yearOf(model, 2025).counts);

    expect(max).toBe(2);
    expect(flameLevel(max, model.cutoffs)).toBeLessThanOrEqual(2);
  });

  it("is shared by every year, so years can be compared by color", () => {
    const quiet = flatYear(2024, 1);
    const loud = dayCounts(2025, null, (_, __, i) => (i % 2 === 0 ? 30 : 0));
    const model = build(calendarOf({ 2024: quiet, 2025: loud }));

    expect(flameLevel(1, model.cutoffs)).toBe(1);
    expect(flameLevel(30, model.cutoffs)).toBeGreaterThan(flameLevel(1, model.cutoffs));
  });
});

describe("buildActivityFlame: insights", () => {
  const insightOf = (counts: number[], year = 2025, createdAt = CREATED_LONG_AGO, extra: Record<number, number[]> = {}) =>
    yearOf(build(calendarOf({ ...extra, [year]: counts }), createdAt), year).insight;

  it("dormant: nothing recorded in the year", () => {
    expect(insightOf(flatYear(2025, 0))).toEqual({ id: "dormant" });
  });

  it("unbroken: active on at least 80% of the days of the journey", () => {
    expect(insightOf(dayCounts(2025, null, (_, __, i) => (i % 10 === 0 ? 0 : 2)))).toEqual({ id: "unbroken" });
  });

  it("accelerating: the last 90 days at least 1.5x the 90 before them", () => {
    const counts = dayCounts(2025, null, (_, __, i) => {
      if (i >= 365 - 90) return i % 2 === 0 ? 2 : 0; // 45 days x 2
      if (i >= 365 - 180) return i % 3 === 0 ? 1 : 0; // 30 days x 1
      return 0;
    });
    expect(insightOf(counts)).toEqual({ id: "accelerating" });
  });

  it("growing: a finished year clearly above the finished year before it", () => {
    const previous = dayCounts(2024, null, (_, __, i) => (i % 3 === 0 ? 1 : 0));
    const current = dayCounts(2025, null, (_, __, i) => (i % 3 === 0 ? 2 : 0));
    const insight = insightOf(current, 2025, CREATED_LONG_AGO, { 2024: previous });
    expect(insight).toEqual({ id: "growing" });
  });

  it("does not compare a year with an unfinished one, nor with the year the account was created", () => {
    const previous = dayCounts(2025, null, (_, __, i) => (i % 3 === 0 ? 1 : 0));
    const current = dayCounts(2026, "2026-10-09", (_, __, i) => (i % 3 === 0 ? 3 : 0));
    const inProgress = yearOf(build(calendarOf({ 2025: previous, 2026: current })), 2026).insight;
    expect(inProgress.id).not.toBe("growing");

    const creationYear = yearOf(build(calendarOf({ 2024: previous, 2025: current }), "2024-07-01T00:00:00Z"), 2025).insight;
    expect(creationYear.id).not.toBe("growing");
  });

  it("weekends: a large share of the energy on Saturdays and Sundays", () => {
    const counts = dayCounts(2025, null, (_, dow) => (dow === 6 ? 3 : 0));
    expect(insightOf(counts)).toEqual({ id: "weekends", percent: 100 });
  });

  it("weekdays: almost all the energy during the week", () => {
    const counts = dayCounts(2025, null, (_, dow) => (dow === 3 ? 3 : 0));
    expect(insightOf(counts)).toEqual({ id: "weekdays", percent: 100 });
  });

  it("singleBlaze: one day holds a large share of the year", () => {
    const spread = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [new Date(Date.UTC(2025, 0, 6 + i * 2)).toISOString().slice(0, 10), 1])
    );
    const counts = sparseYear(2025, {
      ...spread,
      "2025-06-11": 40, // Wednesday
      "2025-03-01": 10, // Saturday
      "2025-03-02": 10, // Sunday
    });
    const total = counts.reduce((sum, count) => sum + count, 0);
    // The week holds ~70% of it, weekends < 40%, and the last 90 days are empty: only one day stands out.
    expect(insightOf(counts)).toEqual({ id: "singleBlaze", percent: Math.round((40 / total) * 100) });
  });

  it("embers: only a few contributions, below every other rule", () => {
    const counts = sparseYear(2025, Object.fromEntries(["2025-02-03", "2025-02-18", "2025-05-02", "2025-08-12"].map((d) => [d, 1])));
    expect(insightOf(counts)).toEqual({ id: "embers" });
  });

  it("steady: the default when nothing stands out", () => {
    const counts = dayCounts(2025, null, (_, dow, i) => {
      if (i >= 365 - 90) return 0;
      if (i % 6 !== 0) return 0;
      return dow === 0 || dow === 6 ? 2 : 3;
    });
    expect(insightOf(counts).id).toBe("steady");
  });

  it("is deterministic: the same calendar always gets the same reading", () => {
    const calendar = calendarOf({ 2025: dayCounts(2025, null, (_, dow, i) => ((i * 7 + dow) % 5 === 0 ? 4 : 0)) });
    expect(build(calendar)).toEqual(build(calendar));
  });
});

describe("buildActivityFlame: small and large profiles", () => {
  it("handles a brand-new account (a few days of one year)", () => {
    const model = build(
      calendarOf({ 2026: sparseYear(2026, { "2026-10-07": 1, "2026-10-08": 2 }, "2026-10-09") }),
      "2026-10-07T00:00:00Z"
    );
    const year = yearOf(model, 2026);

    expect(model.years).toHaveLength(1);
    expect(year.firstDayIndex).toBe(279);
    expect(year.stats.longestStreak?.days).toBe(2);
    // Three days of existence say nothing about discipline: no pattern is claimed, only the embers.
    expect(year.insight.id).toBe("embers");
  });

  it("handles a long history without touching the input and with a compact result", () => {
    const years: Record<number, number[]> = {};
    for (let y = 2012; y <= 2025; y++) years[y] = dayCounts(y, null, (_, dow, i) => ((i * 31 + y) % 7 < 5 && dow !== 0 ? 1 + ((i + y) % 9) : 0));
    years[2026] = dayCounts(2026, "2026-10-09", (_, __, i) => (i % 2 === 0 ? 5 : 0));
    const calendar = calendarOf(years);
    const snapshot = JSON.stringify(calendar);

    const model = buildActivityFlame({ calendar, createdAt: "2012-03-01T00:00:00Z", referenceDate: REFERENCE });

    expect(JSON.stringify(calendar)).toBe(snapshot);
    expect(model.years).toHaveLength(15);
    expect(model.years.reduce((total, entry) => total + entry.stats.contributions, 0)).toBe(model.totalContributions);
    expect(model.cutoffs).toHaveLength(4);
    expect([...model.cutoffs].sort((a, b) => a - b)).toEqual(model.cutoffs);
    // Serializes to the client as plain data, and stays small enough for a page payload.
    expect(JSON.stringify(model).length).toBeLessThan(120_000);
  });
});
