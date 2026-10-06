import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { m, makeProfile } from "@/test/builders";
import { buildDeveloperChronicle } from "./buildDeveloperChronicle";
import { CHRONICLE_RULES } from "./rules";
import { monthlyProfile, noHistoryProfile, yearlyProfile } from "./testing/fixtures";
import type { ChronicleHighlight, ChronicleHighlightKind, ChronicleYear } from "./types";

const REF = "2026-10-01T00:00:00Z";

function highlightsOf(chronicle: ReturnType<typeof buildDeveloperChronicle>, kind: ChronicleHighlightKind) {
  return chronicle.highlights.filter((h) => h.kind === kind);
}

function chapterOf(chronicle: ReturnType<typeof buildDeveloperChronicle>, y: number): ChronicleYear {
  const found = chronicle.years.find((entry) => entry.year === y);
  if (!found) throw new Error(`no chapter for ${y}`);
  return found;
}

/** Account 2017-06 .. 2021-10; the only year under test is 2019 (a in 2018, b in 2019). */
function trend(a: number, b: number) {
  const chronicle = buildDeveloperChronicle(
    yearlyProfile({
      createdAt: "2017-06-01T00:00:00Z",
      referenceDate: "2021-10-01T00:00:00Z",
      years: { 2017: 10, 2018: a, 2019: b, 2020: b, 2021: b },
    })
  );
  return chronicle.highlights.filter((h) => h.year === 2019 && (h.kind === "growth" || h.kind === "decline"));
}

describe("buildDeveloperChronicle: a brand-new account", () => {
  const chronicle = buildDeveloperChronicle(
    yearlyProfile({ createdAt: "2026-09-20T00:00:00Z", referenceDate: REF, years: { 2026: 12 } })
  );

  it("is one chapter that is both the beginning and the current year", () => {
    expect(chronicle.years).toHaveLength(1);
    const [only] = chronicle.years;
    expect(only).toMatchObject({ year: 2026, chapter: "journeyStart", isStart: true, isCurrent: true });
    expect(chronicle.currentChapter).toBe(only);
    expect(chronicle.timeline).toHaveLength(1);
  });

  it("claims no record, no comparison and no elapsed time", () => {
    expect(chronicle.highlights.map((h) => h.kind)).toEqual(["firstChapter"]);
    expect(chronicle.summary.journeyLength).toEqual({ years: 0, months: 0 });
    expect(chronicle.summary.mostActiveYear).toBeNull();
    expect(chronicle.coverage).toBe("full");
  });

  it("opens with the real creation date", () => {
    expect(chronicle.journeyStart).toEqual({ date: "2026-09-20", year: 2026 });
  });
});

describe("buildDeveloperChronicle: several active years", () => {
  const chronicle = buildDeveloperChronicle(
    yearlyProfile({
      createdAt: "2019-03-12T00:00:00Z",
      referenceDate: REF,
      years: { 2019: 40, 2020: 180, 2021: 200, 2022: 190, 2023: 342, 2024: 610, 2025: 1300, 2026: 400 },
    })
  );

  it("tells only the years with something true to say, and collapses the rest", () => {
    expect(chronicle.years.map((y) => y.year)).toEqual([2019, 2023, 2024, 2025, 2026]);
    expect(chronicle.timeline.map((e) => (e.type === "year" ? e.year : `${e.fromYear}-${e.toYear}`))).toEqual([
      2019,
      "2020-2022",
      2023,
      2024,
      2025,
      2026,
    ]);
    const interlude = chronicle.timeline[1];
    expect(interlude).toMatchObject({ type: "interlude", yearCount: 3, contributions: 570, quiet: false });
  });

  it("names chapters by deterministic rules", () => {
    expect(chronicle.years.map((y) => y.chapter)).toEqual([
      "journeyStart",
      "rhythmGrows",
      "rhythmGrows",
      "greatAdvance",
      "currentChapter",
    ]);
  });

  it("finds the most active year and the records of that year", () => {
    expect(highlightsOf(chronicle, "mostActiveYear")).toEqual([
      { kind: "mostActiveYear", year: 2025, rarity: "exceptional", contributions: 1300, partial: false, inProgress: false },
    ]);
    expect(highlightsOf(chronicle, "peakCommits")).toMatchObject([{ year: 2025, commits: 780 }]);
    expect(highlightsOf(chronicle, "peakCollaboration")).toMatchObject([{ year: 2025, pullRequests: 130, reviews: 65 }]);
    expect(chronicle.summary.mostActiveYear).toEqual({ year: 2025, contributions: 1300, coverage: "full" });
  });

  it("lists the facts of a year most important first and reflects the strongest in its rarity", () => {
    const y2025 = chapterOf(chronicle, 2025);
    expect(y2025.highlights.map((h) => h.kind)).toEqual([
      "growth",
      "mostActiveYear",
      "peakCollaboration",
      "peakCommits",
      "milestone",
    ]);
    expect(y2025.rarity).toBe("exceptional");
    expect(chapterOf(chronicle, 2023).rarity).toBe("important");
    expect(chapterOf(chronicle, 2019).rarity).toBe("important");
  });

  it("shows 2-4 of the year's own figures, never projected", () => {
    expect(chapterOf(chronicle, 2025).metrics).toEqual([
      { key: "contributions", value: 1300, coverage: "full" },
      { key: "commits", value: 780, coverage: "full" },
      { key: "pullRequests", value: 130, coverage: "full" },
      { key: "reviews", value: 65, coverage: "full" },
    ]);
  });

  it("marks the highest cumulative milestone in the year it was crossed", () => {
    // 40+180+200+190+342+610 = 1562 by 2024; 2862 by 2025 -> 2.500 crossed in 2025.
    expect(highlightsOf(chronicle, "milestone")).toMatchObject([{ year: 2025, threshold: 2500 }]);
  });

  it("summarises the whole journey", () => {
    expect(chronicle.summary.journeyLength).toEqual({ years: 7, months: 6 });
    expect(chronicle.summary.totalContributions).toEqual({ value: 3262, coverage: "full" });
  });
});

describe("buildDeveloperChronicle: empty years", () => {
  const chronicle = buildDeveloperChronicle(
    yearlyProfile({
      createdAt: "2015-01-10T00:00:00Z",
      referenceDate: "2022-10-01T00:00:00Z",
      years: { 2017: 30, 2018: 20, 2022: 10 },
    })
  );

  it("marks the first year with activity and calls a fully empty stretch quiet", () => {
    expect(chronicle.years.map((y) => [y.year, y.chapter])).toEqual([
      [2015, "journeyStart"],
      [2017, "firstSteps"],
      [2022, "currentChapter"],
    ]);
    expect(chronicle.timeline[1]).toMatchObject({ type: "interlude", fromYear: 2016, toYear: 2016, contributions: 0, quiet: true });
    expect(chronicle.timeline[3]).toMatchObject({ type: "interlude", fromYear: 2018, toYear: 2021, contributions: 20, quiet: false });
  });

  it("does not invent a record when no year reaches the minimum", () => {
    expect(highlightsOf(chronicle, "mostActiveYear")).toEqual([]);
    expect(chronicle.summary.mostActiveYear).toBeNull();
  });

  it("does not call it a return: the profile was never active before the quiet years", () => {
    expect(highlightsOf(chronicle, "return")).toEqual([]);
  });
});

describe("buildDeveloperChronicle: an extremely active year", () => {
  const chronicle = buildDeveloperChronicle(
    yearlyProfile({
      createdAt: "2020-05-01T00:00:00Z",
      referenceDate: REF,
      years: { 2020: 100, 2021: 200, 2022: 20_000, 2023: 300, 2024: 300, 2025: 300, 2026: 100 },
    })
  );

  it("is the most active year, a glowing chapter, and crosses a big milestone", () => {
    const y2022 = chapterOf(chronicle, 2022);
    expect(y2022.rarity).toBe("exceptional");
    expect(y2022.highlights.map((h) => h.kind)).toContain("mostActiveYear");
    // total 21.300 -> 10.000 is the highest milestone reached, crossed in 2022.
    expect(highlightsOf(chronicle, "milestone")).toMatchObject([{ year: 2022, threshold: 10_000 }]);
  });
});

describe("buildDeveloperChronicle: growth and decline thresholds", () => {
  it("reports a real growth", () => {
    expect(trend(200, 336)).toMatchObject([{ kind: "growth", percent: 68, previousYear: 2018, doubled: false }]);
  });

  it("marks a doubling", () => {
    expect(trend(200, 400)).toMatchObject([{ kind: "growth", percent: 100, doubled: true }]);
  });

  it("ignores a +2% change", () => {
    expect(trend(200, 204)).toEqual([]);
  });

  it("ignores growth from almost nothing (not a trend)", () => {
    expect(trend(10, 30)).toEqual([]);
  });

  it("ignores a large percentage that is a small absolute change", () => {
    expect(trend(25, 40)).toEqual([]);
  });

  it("reports a drop of half or more as a decline", () => {
    expect(trend(600, 250)).toMatchObject([{ kind: "decline", percent: 58, previousYear: 2018 }]);
  });

  it("ignores a moderate drop and a drop from a small base", () => {
    expect(trend(600, 400)).toEqual([]);
    expect(trend(50, 20)).toEqual([]);
  });

  it("never compares against the unfinished creation or current year", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2020-11-01T00:00:00Z",
        referenceDate: "2022-02-01T00:00:00Z",
        years: { 2020: 30, 2021: 1000, 2022: 5 },
      })
    );
    expect(highlightsOf(chronicle, "growth")).toEqual([]);
    expect(highlightsOf(chronicle, "decline")).toEqual([]);
  });
});

describe("buildDeveloperChronicle: consecutive declines", () => {
  it("tells only the first year of a run of declines (the same story), and a new decline after a recovery", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2012-01-10T00:00:00Z",
        referenceDate: REF,
        years: {
          2012: 50,
          2013: 1000,
          2014: 400, // -60%  told
          2015: 150, // -62%  same run, not told again
          2016: 60, //  -60%  same run
          2017: 700, // growth
          2018: 300, // -57%  a new decline after a recovery: told
          2019: 290,
          2020: 280,
          2021: 270,
          2022: 260,
          2023: 250,
          2024: 240,
          2025: 230,
          2026: 100,
        },
      })
    );
    expect(highlightsOf(chronicle, "decline").map((h) => h.year)).toEqual([2014, 2018]);
  });
});

describe("buildDeveloperChronicle: return after a long quiet period", () => {
  const years = { 2014: 150, 2015: 400, 2016: 5, 2017: 0, 2018: 3, 2019: 450, 2020: 300, 2021: 300, 2022: 300, 2023: 300, 2024: 300, 2025: 300, 2026: 100 };
  const chronicle = buildDeveloperChronicle(yearlyProfile({ createdAt: "2014-02-01T00:00:00Z", referenceDate: REF, years }));

  it("proves the return from the data: active, quiet for years, then strong again", () => {
    expect(highlightsOf(chronicle, "return")).toEqual([
      { kind: "return", year: 2019, rarity: "important", dormantYears: 3, contributions: 450 },
    ]);
    expect(chapterOf(chronicle, 2019).chapter).toBe("returnToJourney");
  });

  it("does not also call the return year a growth, even when the numbers would qualify", () => {
    // 2018 = 20 is still "quiet" (<= 20) yet a valid growth base (>= 20): 20 -> 450 would be growth on its own.
    const edge = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2014-02-01T00:00:00Z", referenceDate: REF, years: { ...years, 2018: 20 } })
    );
    expect(highlightsOf(edge, "return")).toMatchObject([{ year: 2019, dormantYears: 3 }]);
    expect(highlightsOf(edge, "growth").filter((h) => h.year === 2019)).toEqual([]);
  });

  it("still tells the drop that began the quiet period, as a calm chapter", () => {
    expect(highlightsOf(chronicle, "decline")).toMatchObject([{ year: 2016, previousYear: 2015, percent: 99 }]);
    expect(chapterOf(chronicle, 2016)).toMatchObject({ chapter: "quietSeason", rarity: "normal" });
  });

  it("requires at least two quiet years", () => {
    const one = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2014-02-01T00:00:00Z",
        referenceDate: REF,
        years: { ...years, 2016: 400, 2017: 5, 2018: 400 },
      })
    );
    expect(highlightsOf(one, "return")).toEqual([]);
  });

  it("requires a strong comeback, not just a bit more activity", () => {
    const weak = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2014-02-01T00:00:00Z",
        referenceDate: REF,
        years: { ...years, 2019: CHRONICLE_RULES.returnMinContributions - 1 },
      })
    );
    expect(highlightsOf(weak, "return")).toEqual([]);
  });
});

describe("buildDeveloperChronicle: the current chapter", () => {
  const chronicle = buildDeveloperChronicle(
    yearlyProfile({
      createdAt: "2019-03-12T00:00:00Z",
      referenceDate: REF,
      years: {
        2019: 40,
        2020: 300,
        2026: { contributions: 250, commits: 187, pullRequests: 14, reviews: 7, issues: 3, activeDays: 62 },
      },
    })
  );

  it("is the last chapter, with exactly the figures read so far", () => {
    expect(chronicle.years.at(-1)).toBe(chronicle.currentChapter);
    expect(chronicle.currentChapter).toMatchObject({ year: 2026, chapter: "currentChapter", isCurrent: true, isStart: false });
    expect(chronicle.currentChapter.metrics).toEqual([
      { key: "contributions", value: 250, coverage: "full" },
      { key: "commits", value: 187, coverage: "full" },
      { key: "pullRequests", value: 14, coverage: "full" },
      { key: "reviews", value: 7, coverage: "full" },
    ]);
  });

  it("keeps the current year's facts but names it the current chapter", () => {
    const rich = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2019-03-12T00:00:00Z",
        referenceDate: REF,
        years: { 2019: 40, 2020: 100, 2026: 900 },
      })
    );
    expect(rich.currentChapter.chapter).toBe("currentChapter");
    expect(rich.currentChapter.highlights.map((h) => h.kind)).toContain("mostActiveYear");
    expect(highlightsOf(rich, "mostActiveYear")).toMatchObject([{ year: 2026, inProgress: true }]);
  });
});

describe("buildDeveloperChronicle: longest streak", () => {
  const base = {
    createdAt: "2019-03-12T00:00:00Z",
    referenceDate: REF,
    years: { 2019: 40, 2023: 200, 2024: 120 },
  };

  it("places the streak in the year it ended", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ ...base, longestStreak: { start: "2023-12-20", end: "2024-01-10", days: 22 } })
    );
    expect(highlightsOf(chronicle, "longestStreak")).toEqual([
      { kind: "longestStreak", year: 2024, rarity: "exceptional", days: 22, start: "2023-12-20", end: "2024-01-10", ongoing: false },
    ]);
    expect(chapterOf(chronicle, 2024).chapter).toBe("steadyMarch");
    expect(chronicle.summary.longestStreak).toEqual({ value: 22, coverage: "full" });
  });

  it("is 'ongoing' (not ended) while it reaches today or yesterday, and ended once a whole day was missed", () => {
    const streak = (start: string, end: string, days: number) =>
      buildDeveloperChronicle(
        yearlyProfile({ ...base, createdAt: "2026-01-01T00:00:00Z", years: { 2026: 300 }, longestStreak: { start, end, days } })
      );
    // reference date: 2026-10-01
    expect(highlightsOf(streak("2026-09-01", "2026-10-01", 31), "longestStreak")).toMatchObject([{ days: 31, ongoing: true }]);
    expect(highlightsOf(streak("2026-09-01", "2026-09-30", 30), "longestStreak")).toMatchObject([{ ongoing: true }]);
    expect(highlightsOf(streak("2026-09-01", "2026-09-29", 29), "longestStreak")).toMatchObject([{ ongoing: false }]);
  });

  it("is not an event when it is short", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ ...base, longestStreak: { start: "2024-02-01", end: "2024-02-05", days: 5 } })
    );
    expect(highlightsOf(chronicle, "longestStreak")).toEqual([]);
    expect(chronicle.summary.longestStreak).toEqual({ value: 5, coverage: "full" });
  });

  it("is not claimed when the recorded period disagrees with the figure", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ ...base, longestStreak: { start: "2023-12-20", end: "2024-01-10", days: 25 } })
    );
    expect(highlightsOf(chronicle, "longestStreak")).toEqual([]);
  });

  it("is not claimed as 'the longest' when the figure is only a lower bound", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ ...base, longestStreak: { start: "2023-12-20", end: "2024-01-10", days: 22, coverage: "partial" } })
    );
    expect(highlightsOf(chronicle, "longestStreak")).toEqual([]);
    expect(chronicle.summary.longestStreak).toEqual({ value: 22, coverage: "partial" });
  });
});

describe("buildDeveloperChronicle: coverage", () => {
  describe("partial (some years of the account were not read)", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2018-04-01T00:00:00Z",
        referenceDate: REF,
        omitYears: [2018, 2019, 2020],
        yearlyCoverage: "partial",
        years: { 2021: 100, 2022: 200, 2023: 300, 2024: 400, 2025: 500, 2026: 100 },
      })
    );

    it("is partial and says so in every total", () => {
      expect(chronicle.coverage).toBe("partial");
      expect(chronicle.summary.totalContributions).toEqual({ value: 1600, coverage: "partial" });
      expect(chronicle.summary.mostActiveYear).toEqual({ year: 2025, contributions: 500, coverage: "partial" });
      expect(highlightsOf(chronicle, "mostActiveYear")).toMatchObject([{ partial: true }]);
    });

    it("never turns an unread year into zero", () => {
      const start = chapterOf(chronicle, 2018);
      expect(start).toMatchObject({ isStart: true, known: false, metrics: [] });
      const gap = chronicle.timeline.find((e) => e.type === "interlude" && e.fromYear === 2019);
      expect(gap).toMatchObject({ fromYear: 2019, toYear: 2021, contributions: null, quiet: false });
    });

    it("claims nothing that needs the whole history (first activity, milestones)", () => {
      expect(highlightsOf(chronicle, "firstActivity")).toEqual([]);
      expect(highlightsOf(chronicle, "milestone")).toEqual([]);
    });

    it("still reports changes between two years it did read", () => {
      expect(highlightsOf(chronicle, "growth").map((h) => h.year)).toEqual([2022, 2023]);
    });
  });

  describe("partial monthly series (lower bounds)", () => {
    const chronicle = buildDeveloperChronicle(
      monthlyProfile("2024-11-15T00:00:00Z", REF, [...Array.from({ length: 23 }, (_, i) => (i < 2 ? 50 : 20))], "partial")
    );

    it("marks every figure partial and refuses comparisons it cannot trust", () => {
      expect(chronicle.coverage).toBe("partial");
      expect(chronicle.years.flatMap((y) => y.metrics).every((metric) => metric.coverage === "partial")).toBe(true);
      expect(highlightsOf(chronicle, "growth")).toEqual([]);
      expect(highlightsOf(chronicle, "decline")).toEqual([]);
      expect(highlightsOf(chronicle, "milestone")).toEqual([]);
    });
  });

  describe("unavailable (no contribution history)", () => {
    const chronicle = buildDeveloperChronicle(noHistoryProfile("2019-03-12T00:00:00Z", REF));

    it("knows only the creation date and shows no figure at all", () => {
      expect(chronicle.coverage).toBe("unavailable");
      expect(chronicle.highlights.map((h) => h.kind)).toEqual(["firstChapter"]);
      expect(chronicle.years.map((y) => y.year)).toEqual([2019, 2026]);
      expect(chronicle.years.every((y) => y.metrics.length === 0 && !y.known)).toBe(true);
      expect(chronicle.timeline.every((entry) => entry.type === "year")).toBe(true);
      expect(chronicle.summary.totalContributions).toBeNull();
      expect(chronicle.summary.mostActiveYear).toBeNull();
      expect(chronicle.summary.longestStreak).toBeNull();
    });

    it("still has the journey length, which comes from the creation date", () => {
      expect(chronicle.summary.journeyLength).toEqual({ years: 7, months: 6 });
    });
  });
});

describe("buildDeveloperChronicle: monthly series only (mock sources)", () => {
  // Nov 2024 .. Oct 2026: 2024 = 50, 2025 = 120, 2026 = 150 so far
  const months = [30, 20, ...Array.from({ length: 12 }, () => 10), ...Array.from({ length: 10 }, () => 15)];
  const chronicle = buildDeveloperChronicle(monthlyProfile("2024-11-15T00:00:00Z", REF, months));

  it("derives contributions per year and nothing else", () => {
    expect(chronicle.coverage).toBe("full");
    expect(chapterOf(chronicle, 2024).metrics).toEqual([{ key: "contributions", value: 50, coverage: "full" }]);
    expect(chapterOf(chronicle, 2026).metrics).toEqual([{ key: "contributions", value: 150, coverage: "full" }]);
    expect(highlightsOf(chronicle, "peakCommits")).toEqual([]);
    expect(highlightsOf(chronicle, "peakCollaboration")).toEqual([]);
  });

  it("marks the year in progress as such", () => {
    expect(highlightsOf(chronicle, "mostActiveYear")).toMatchObject([{ year: 2026, contributions: 150, inProgress: true }]);
  });
});

describe("buildDeveloperChronicle: how many years make a record", () => {
  const rules = CHRONICLE_RULES;

  it("two years of activity are not a record: one of them is partial, so 'the best' would mean little", () => {
    expect(rules.minYearsToCompare).toBe(3);
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2025-06-02T00:00:00Z", referenceDate: REF, years: { 2025: 71, 2026: 649 } })
    );
    expect(chronicle.highlights.map((h) => h.kind)).toEqual(["firstChapter"]);
    expect(chronicle.summary.mostActiveYear).toBeNull();
  });

  it("three years with activity are enough", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2024-06-02T00:00:00Z", referenceDate: REF, years: { 2024: 71, 2025: 649, 2026: 100 } })
    );
    expect(highlightsOf(chronicle, "mostActiveYear")).toMatchObject([{ year: 2025, contributions: 649 }]);
  });

  it("a streak is a fact on its own and needs no comparison", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2025-06-02T00:00:00Z",
        referenceDate: REF,
        years: { 2025: 71, 2026: 649 },
        longestStreak: { start: "2026-07-13", end: "2026-08-08", days: 27 },
      })
    );
    expect(highlightsOf(chronicle, "longestStreak")).toMatchObject([{ year: 2026, days: 27 }]);
  });
});

describe("buildDeveloperChronicle: today's snapshot", () => {
  it("keeps language and stars apart from the history, only when there is something to say", () => {
    const profile = yearlyProfile({
      createdAt: "2019-03-12T00:00:00Z",
      referenceDate: REF,
      years: {},
      overrides: {
        starsReceived: m(1200),
        languages: [
          { name: "Go", bytes: 100, repoCount: 1 },
          { name: "TypeScript", bytes: 900, repoCount: 4 },
        ],
      },
    });
    expect(buildDeveloperChronicle(profile).present).toEqual({
      topLanguage: { name: "TypeScript", coverage: "full" },
      starsReceived: { value: 1200, coverage: "full" },
    });

    const quiet = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2019-03-12T00:00:00Z",
        referenceDate: REF,
        years: {},
        overrides: { starsReceived: m(3), languagesCoverage: "unavailable" },
      })
    );
    expect(quiet.present).toEqual({ topLanguage: null, starsReceived: null });
  });

  it("uses the first name of the display name", () => {
    const named = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2019-03-12T00:00:00Z", referenceDate: REF, years: {}, overrides: { displayName: "Jonathan Nwokolo" } })
    );
    expect(named.adventurerName).toBe("Jonathan");
    expect(buildDeveloperChronicle(makeProfile({ username: "octocat" })).adventurerName).toBe("octocat");
  });
});

describe("buildDeveloperChronicle: determinism", () => {
  const profile = yearlyProfile({
    createdAt: "2019-03-12T00:00:00Z",
    referenceDate: REF,
    years: { 2019: 40, 2020: 180, 2021: 200, 2022: 190, 2023: 342, 2024: 610, 2025: 1300, 2026: 400 },
    longestStreak: { start: "2023-12-20", end: "2024-01-10", days: 22 },
  });

  it("returns the same chronicle for the same profile, and plain serialisable data", () => {
    const first = buildDeveloperChronicle(profile);
    expect(buildDeveloperChronicle(profile)).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("does not mutate its input", () => {
    const before = JSON.stringify(profile);
    buildDeveloperChronicle(profile);
    expect(JSON.stringify(profile)).toBe(before);
  });

  it("depends on the profile's referenceDate, not on today's date", () => {
    const later = buildDeveloperChronicle({ ...profile, referenceDate: "2027-02-01T00:00:00Z" });
    expect(later.currentChapter.year).toBe(2027);
    expect(buildDeveloperChronicle(profile).currentChapter.year).toBe(2026);
  });
});

describe("Chronicle logic stays pure", () => {
  const FILES = ["buildDeveloperChronicle.ts", "highlights.ts", "yearStats.ts", "rules.ts", "types.ts"];
  const FORBIDDEN: Array<[string, RegExp]> = [
    ["React", /from\s+["']react/],
    ["Math.random", /Math\.random\s*\(/],
    ["the wall clock", /Date\.now\s*\(|new Date\s*\(\s*\)/],
    ["fetch", /\bfetch\s*\(/],
    ["the DOM", /\bwindow\.|\bdocument\.|localStorage/],
    ["the i18n / stores", /from\s+["']@\/(i18n|stores|design-system)/],
    ["the data layer", /from\s+["']@\/data/],
  ];

  for (const [label, pattern] of FORBIDDEN) {
    it(`never touches ${label}`, () => {
      const offenders = FILES.filter((file) => pattern.test(readFileSync(resolve(__dirname, file), "utf8")));
      expect(offenders).toEqual([]);
    });
  }
});

describe("highlights are well-formed", () => {
  it("every highlight belongs to a chapter of the timeline", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2019-03-12T00:00:00Z",
        referenceDate: REF,
        years: { 2019: 40, 2020: 180, 2021: 200, 2022: 190, 2023: 342, 2024: 610, 2025: 1300, 2026: 400 },
      })
    );
    const chapterYears = new Set(chronicle.years.map((y) => y.year));
    const flat: ChronicleHighlight[] = chronicle.years.flatMap((y) => y.highlights);
    expect(flat).toEqual(chronicle.highlights);
    expect(chronicle.highlights.every((h) => chapterYears.has(h.year))).toBe(true);
  });
});
