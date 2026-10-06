import type { DeveloperProfile } from "@/game/types";
import { CHRONICLE_RULES as RULES } from "./rules";
import type { ChronicleChapterId, ChronicleHighlight } from "./types";
import type { YearHistory, YearStats } from "./yearStats";

/**
 * One detector per kind of fact. Each reads ONLY what the profile really records per year and returns
 * [] when the data cannot prove the fact. No clock, no randomness: everything comes from `ctx`.
 */
export interface DetectionContext {
  profile: DeveloperProfile;
  history: YearHistory;
  createdYear: number;
  currentYear: number;
}

const DAY_MS = 86_400_000;

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/** Inclusive number of days between two "YYYY-MM-DD" dates. */
export function inclusiveDays(start: string, end: string): number {
  return dayNumber(end) - dayNumber(start) + 1;
}

/** A calendar year fully inside the journey: not the creation year (starts mid-year) nor the current one (unfinished). */
function isComplete(ctx: DetectionContext, year: number): boolean {
  return year !== ctx.createdYear && year !== ctx.currentYear && ctx.history.stats.has(year);
}

function knownStats(ctx: DetectionContext): YearStats[] {
  return ctx.history.accountYears.flatMap((year) => ctx.history.stats.get(year) ?? []);
}

/** The year with the highest `pick`, ties to the EARLIEST. Needs `minYears` years with pick > 0 and the best to reach `floor`. */
function peak(stats: YearStats[], pick: (s: YearStats) => number | null, floor: number): { stat: YearStats; value: number } | null {
  let best: { stat: YearStats; value: number } | null = null;
  let withActivity = 0;
  for (const stat of stats) {
    const value = pick(stat);
    if (value === null) return null; // no breakdown for this source: nothing is claimed
    if (value > 0) withActivity++;
    if (best === null || value > best.value) best = { stat, value };
  }
  if (best === null || withActivity < RULES.minYearsToCompare || best.value < floor) return null;
  return best;
}

function detectFirstChapter(ctx: DetectionContext): ChronicleHighlight[] {
  const date = new Date(ctx.profile.accountCreatedAt).toISOString().slice(0, 10);
  return [{ kind: "firstChapter", year: ctx.createdYear, rarity: "important", date }];
}

/** First year with any contribution, when it is NOT the creation year and every year before it is known to be empty. */
function detectFirstActivity(ctx: DetectionContext): ChronicleHighlight[] {
  for (const year of ctx.history.accountYears) {
    const stat = ctx.history.stats.get(year);
    if (!stat) return []; // an unread year before it: we cannot say it was the first
    if (stat.contributions > 0) {
      return year > ctx.createdYear
        ? [{ kind: "firstActivity", year, rarity: "important", contributions: stat.contributions }]
        : [];
    }
  }
  return [];
}

function detectMostActiveYear(ctx: DetectionContext): ChronicleHighlight[] {
  const best = peak(knownStats(ctx), (s) => s.contributions, RULES.minPeakContributions);
  if (!best) return [];
  return [
    {
      kind: "mostActiveYear",
      year: best.stat.year,
      rarity: "exceptional",
      contributions: best.value,
      partial: ctx.history.coverage !== "full",
      inProgress: best.stat.year === ctx.currentYear,
    },
  ];
}

function detectPeakCommits(ctx: DetectionContext): ChronicleHighlight[] {
  const best = peak(knownStats(ctx), (s) => s.commits, RULES.minPeakCommits);
  return best ? [{ kind: "peakCommits", year: best.stat.year, rarity: "exceptional", commits: best.value }] : [];
}

function detectPeakCollaboration(ctx: DetectionContext): ChronicleHighlight[] {
  const best = peak(
    knownStats(ctx),
    (s) => (s.pullRequests === null || s.reviews === null ? null : s.pullRequests + s.reviews),
    RULES.minPeakCollaboration
  );
  if (!best) return [];
  return [
    {
      kind: "peakCollaboration",
      year: best.stat.year,
      rarity: "exceptional",
      pullRequests: best.stat.pullRequests ?? 0,
      reviews: best.stat.reviews ?? 0,
    },
  ];
}

/**
 * The longest streak, placed in the year it ENDED. Only when its figure is complete (full coverage) and the
 * recorded period agrees with it: a disagreement means we cannot trust where it happened, so nothing is claimed.
 */
function detectLongestStreak(ctx: DetectionContext): ChronicleHighlight[] {
  const { longestStreakPeriod: period, longestStreakDays: days } = ctx.profile.activity;
  if (!period || days.coverage !== "full") return [];
  const length = inclusiveDays(period.start, period.end);
  if (length !== days.value || length < RULES.minStreakDays) return [];
  const year = Number(period.end.slice(0, 4));
  if (!ctx.history.stats.has(year)) return [];
  // Same rule as the current streak: still alive if it reaches today or yesterday (today is not over).
  const referenceDay = dayNumber(new Date(ctx.profile.referenceDate).toISOString().slice(0, 10));
  const ongoing = dayNumber(period.end) >= referenceDay - 1;
  return [{ kind: "longestStreak", year, rarity: "exceptional", days: length, start: period.start, end: period.end, ongoing }];
}

/**
 * Quiet stretch followed by a strong comeback. Quiet = at least `dormantMinYears` consecutive complete years
 * with at most `dormantMaxContributions`, AFTER a year that was active (otherwise the profile never "left").
 * The return is the year right after the stretch, if it reaches `returnMinContributions`.
 */
export function detectReturns(ctx: DetectionContext): Extract<ChronicleHighlight, { kind: "return" }>[] {
  if (ctx.history.coverage === "unavailable") return [];
  const { accountYears, stats } = ctx.history;
  const found: Extract<ChronicleHighlight, { kind: "return" }>[] = [];

  const isQuiet = (year: number) => {
    const stat = stats.get(year);
    return isComplete(ctx, year) && stat !== undefined && stat.coverage === "full" && stat.contributions <= RULES.dormantMaxContributions;
  };

  let index = 0;
  while (index < accountYears.length) {
    if (!isQuiet(accountYears[index])) {
      index++;
      continue;
    }
    const start = index;
    while (index < accountYears.length && isQuiet(accountYears[index])) index++;
    const length = index - start;
    const after = stats.get(accountYears[index]);
    const activeBefore = accountYears
      .slice(0, start)
      .some((year) => (stats.get(year)?.contributions ?? 0) >= RULES.returnMinActiveBefore);
    if (length >= RULES.dormantMinYears && activeBefore && after && after.contributions >= RULES.returnMinContributions) {
      found.push({ kind: "return", year: after.year, rarity: "important", dormantYears: length, contributions: after.contributions });
    }
  }
  return found;
}

/** Year-over-year change between two COMPLETE years with exact figures. Growth is skipped for a return year (same story). */
function detectTrend(ctx: DetectionContext, returnYears: ReadonlySet<number>): ChronicleHighlight[] {
  const found: ChronicleHighlight[] = [];
  const declineYears = new Set<number>();
  for (const year of ctx.history.accountYears) {
    const previous = ctx.history.stats.get(year - 1);
    const current = ctx.history.stats.get(year);
    if (!previous || !current || !isComplete(ctx, year) || !isComplete(ctx, year - 1)) continue;
    if (previous.coverage !== "full" || current.coverage !== "full") continue;

    const before = previous.contributions;
    const after = current.contributions;
    const growth = RULES.growth;
    if (
      !returnYears.has(year) &&
      before >= growth.minPrevious &&
      after >= before * growth.minRatio &&
      after - before >= growth.minIncrease
    ) {
      found.push({
        kind: "growth",
        year,
        rarity: "important",
        percent: Math.round((after / before - 1) * 100),
        previousYear: year - 1,
        doubled: after >= before * growth.doubledRatio,
      });
    } else if (before >= RULES.decline.minPrevious && after <= before * RULES.decline.maxRatio) {
      // A decline right after another decline is the same story: it is counted, not told again.
      if (!declineYears.has(year - 1)) {
        found.push({
          kind: "decline",
          year,
          rarity: "normal",
          percent: Math.round((1 - after / before) * 100),
          previousYear: year - 1,
        });
      }
      declineYears.add(year);
    }
  }
  return found;
}

/** The highest cumulative-contributions milestone reached, in the year it was crossed. Needs the WHOLE history. */
function detectMilestone(ctx: DetectionContext): ChronicleHighlight[] {
  if (ctx.history.coverage !== "full") return [];
  const stats = knownStats(ctx);
  if (stats.some((s) => s.coverage !== "full")) return [];
  const total = stats.reduce((sum, s) => sum + s.contributions, 0);
  const threshold = [...RULES.milestones].reverse().find((value) => total >= value);
  if (threshold === undefined) return [];

  let cumulative = 0;
  for (const stat of stats) {
    cumulative += stat.contributions;
    if (cumulative >= threshold) return [{ kind: "milestone", year: stat.year, rarity: "important", threshold }];
  }
  return [];
}

/** Chapter a highlight earns, in the order they compete for a year's title (first match wins). */
const CHAPTER_PRIORITY: ReadonlyArray<{ chapter: ChronicleChapterId; matches: (h: ChronicleHighlight) => boolean }> = [
  { chapter: "returnToJourney", matches: (h) => h.kind === "return" },
  { chapter: "greatAdvance", matches: (h) => h.kind === "growth" && h.doubled },
  { chapter: "legendaryYear", matches: (h) => h.kind === "mostActiveYear" },
  { chapter: "rhythmGrows", matches: (h) => h.kind === "growth" },
  { chapter: "collaborationEra", matches: (h) => h.kind === "peakCollaboration" },
  { chapter: "constructionSeason", matches: (h) => h.kind === "peakCommits" },
  { chapter: "steadyMarch", matches: (h) => h.kind === "longestStreak" },
  { chapter: "historicMilestone", matches: (h) => h.kind === "milestone" },
  { chapter: "quietSeason", matches: (h) => h.kind === "decline" },
  { chapter: "firstSteps", matches: (h) => h.kind === "firstActivity" },
];

/** Lower = earlier. The opening chapter always leads; the rest follow the title priority. */
export function highlightOrder(highlight: ChronicleHighlight): number {
  if (highlight.kind === "firstChapter") return -1;
  return CHAPTER_PRIORITY.findIndex((rule) => rule.matches(highlight));
}

/** The chapter a highlight names, or null for the opening one (which names "journeyStart" through the start flag). */
export function chapterOf(highlight: ChronicleHighlight): ChronicleChapterId | null {
  return CHAPTER_PRIORITY.find((rule) => rule.matches(highlight))?.chapter ?? null;
}

/** Every highlight of the profile, chronological, most important first within a year. Deterministic. */
export function detectHighlights(ctx: DetectionContext): ChronicleHighlight[] {
  const hasHistory = ctx.history.coverage !== "unavailable";
  const returns = hasHistory ? detectReturns(ctx) : [];
  const returnYears = new Set(returns.map((item) => item.year));

  const all: ChronicleHighlight[] = [
    ...detectFirstChapter(ctx),
    ...(hasHistory
      ? [
          ...detectFirstActivity(ctx),
          ...detectMostActiveYear(ctx),
          ...detectPeakCommits(ctx),
          ...detectPeakCollaboration(ctx),
          ...detectLongestStreak(ctx),
          ...returns,
          ...detectTrend(ctx, returnYears),
          ...detectMilestone(ctx),
        ]
      : []),
  ];
  return all.sort((a, b) => a.year - b.year || highlightOrder(a) - highlightOrder(b));
}
