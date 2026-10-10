import type { DataCoverage } from "@/game/types";
import { FLAME_RULES } from "./rules";
import type {
  ActivityFlameModel,
  FlameInsight,
  FlameLevel,
  FlameRecords,
  FlameRun,
  FlameYear,
} from "./types";

/**
 * Builds the model of the "Chama da Atividade" from the per-day calendar already read from GitHub.
 * Pure: no clock (today is `referenceDate`), no randomness, no I/O, no React, no i18n.
 *
 * Days are UTC calendar days ("YYYY-MM-DD") exactly as GitHub reports them.
 */

const DAY_MS = 86_400_000;

export interface FlameCalendarInput {
  years: ReadonlyArray<{ year: number; counts: readonly number[] }>;
  coverage: DataCoverage;
}

export interface BuildActivityFlameInput {
  calendar: FlameCalendarInput | null | undefined;
  /** ISO date of account creation. */
  createdAt: string;
  /** ISO date the data was observed ("today"). */
  referenceDate: string;
}

const yearStartDay = (year: number): number => Math.floor(Date.UTC(year, 0, 1) / DAY_MS);
const dayOf = (iso: string): number => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS);
const isoOf = (day: number): string => new Date(day * DAY_MS).toISOString().slice(0, 10);
const dayOfWeek = (day: number): number => (((day + 4) % 7) + 7) % 7; // 0 = Sunday (1970-01-01 was a Thursday)

/** Which of the 6 levels a day with `count` contributions lights. `cutoffs` come from `ActivityFlameModel`. */
export function flameLevel(count: number, cutoffs: readonly number[]): FlameLevel {
  if (count <= 0) return 0;
  let relative = 1;
  for (const cutoff of cutoffs) {
    if (count > cutoff) relative++;
  }
  const floors = FLAME_RULES.levelFloors;
  let absolute = 1;
  for (let level = 1; level < floors.length; level++) {
    if (count >= floors[level]) absolute = level + 1;
  }
  return Math.min(relative, absolute, 5) as FlameLevel;
}

/** Nearest-rank percentiles of the positive day counts. */
function computeCutoffs(positiveCounts: number[]): number[] {
  if (positiveCounts.length === 0) return FLAME_RULES.levelPercentiles.map(() => 0);
  const sorted = [...positiveCounts].sort((a, b) => a - b);
  return FLAME_RULES.levelPercentiles.map((p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))]);
}

interface Run {
  startDay: number;
  endDay: number;
}

function toRuns(activeDays: readonly number[]): Run[] {
  const runs: Run[] = [];
  for (const day of activeDays) {
    const last = runs[runs.length - 1];
    if (last && day === last.endDay + 1) last.endDay = day;
    else runs.push({ startDay: day, endDay: day });
  }
  return runs;
}

function emptyModel(coverage: DataCoverage): ActivityFlameModel {
  return { coverage, years: [], defaultYear: null, cutoffs: computeCutoffs([]), totalContributions: 0 };
}

export function buildActivityFlame(input: BuildActivityFlameInput): ActivityFlameModel {
  const { calendar } = input;
  if (!calendar || calendar.coverage === "unavailable" || calendar.years.length === 0) {
    return emptyModel("unavailable");
  }

  const byYear = new Map<number, readonly number[]>();
  for (const entry of calendar.years) byYear.set(entry.year, entry.counts);
  const yearNumbers = [...byYear.keys()].sort((a, b) => a - b);

  const referenceDay = dayOf(input.referenceDate);
  const referenceYear = new Date(referenceDay * DAY_MS).getUTCFullYear();
  const createdDay = dayOf(input.createdAt);
  const createdYear = new Date(createdDay * DAY_MS).getUTCFullYear();

  // Active days of the whole history, then its runs of consecutive days (a run may cross a year boundary).
  const activeDays: number[] = [];
  const positiveCounts: number[] = [];
  for (const year of yearNumbers) {
    const start = yearStartDay(year);
    byYear.get(year)!.forEach((count, index) => {
      if (count > 0) {
        activeDays.push(start + index);
        positiveCounts.push(count);
      }
    });
  }
  const runs = toRuns(activeDays);
  const cutoffs = computeCutoffs(positiveCounts);

  const toFlameRun = (run: Run, endDay: number): FlameRun => {
    const startYear = new Date(run.startDay * DAY_MS).getUTCFullYear();
    const startsAtUnreadBoundary =
      run.startDay === yearStartDay(startYear) && startYear > createdYear && !byYear.has(startYear - 1);
    return {
      start: isoOf(run.startDay),
      end: isoOf(endDay),
      days: endDay - run.startDay + 1,
      exact: !startsAtUnreadBoundary,
    };
  };

  const years: FlameYear[] = yearNumbers.map((year) => {
    const counts = [...byYear.get(year)!];
    const yearStart = yearStartDay(year);
    const lastDay = yearStart + counts.length - 1;

    const firstNonZero = counts.findIndex((count) => count > 0);
    let firstDayIndex = year === createdYear ? Math.max(0, createdDay - yearStart) : 0;
    if (firstNonZero >= 0) firstDayIndex = Math.min(firstDayIndex, firstNonZero);
    firstDayIndex = Math.min(firstDayIndex, Math.max(0, counts.length - 1));

    // Longest streak as of the end of this year: runs touching the year, counted up to its last day.
    let longestStreak: FlameRun | null = null;
    for (const run of runs) {
      if (run.endDay < yearStart || run.startDay > lastDay) continue;
      const candidate = toFlameRun(run, Math.min(run.endDay, lastDay));
      if (longestStreak === null || candidate.days > longestStreak.days) longestStreak = candidate;
    }

    // Streak alive at the end of the view; the year in progress may still be alive through yesterday.
    const inProgress = year === referenceYear;
    const lastCount = counts[counts.length - 1] ?? 0;
    const anchor = inProgress && lastCount === 0 ? lastDay - 1 : lastDay;
    const alive = runs.find((run) => run.startDay <= anchor && anchor <= run.endDay);
    const endRun = alive ? toFlameRun(alive, Math.min(anchor, lastDay)) : null;

    const contributions = counts.reduce((total, count) => total + count, 0);
    const activeCount = counts.reduce((total, count) => total + (count > 0 ? 1 : 0), 0);

    const records = computeRecords(counts, yearStart, longestStreak);
    const previous = byYear.get(year - 1);
    return {
      year,
      counts,
      firstDayIndex,
      inProgress,
      stats: {
        contributions,
        activeDays: activeCount,
        longestStreak,
        endStreak: { days: endRun?.days ?? 0, exact: endRun?.exact ?? true },
      },
      records,
      insight: chooseInsight({
        year,
        counts,
        yearStart,
        firstDayIndex,
        contributions,
        activeDays: activeCount,
        records,
        previousContributions: previous ? previous.reduce((total, count) => total + count, 0) : null,
        previousIsFinished: previous !== undefined && year - 1 > createdYear,
        yearIsFinished: year > createdYear && year < referenceYear,
      }),
    };
  });

  return {
    coverage: calendar.coverage,
    years,
    defaultYear: years[years.length - 1].year,
    cutoffs,
    totalContributions: years.reduce((total, year) => total + year.stats.contributions, 0),
  };
}

function computeRecords(counts: readonly number[], yearStart: number, longestStreak: FlameRun | null): FlameRecords {
  let bestDay: FlameRecords["bestDay"] = null;
  const weeks = new Map<number, { start: number; end: number; count: number }>();
  const months = new Array<number>(12).fill(0);

  counts.forEach((count, index) => {
    const day = yearStart + index;
    if (count > 0 && (bestDay === null || count > bestDay.count)) bestDay = { date: isoOf(day), count };

    const weekStart = day - dayOfWeek(day);
    const week = weeks.get(weekStart) ?? { start: day, end: day, count: 0 };
    week.end = day;
    week.count += count;
    weeks.set(weekStart, week);

    months[new Date(day * DAY_MS).getUTCMonth()] += count;
  });

  let bestWeek: FlameRecords["bestWeek"] = null;
  for (const week of weeks.values()) {
    if (week.count > 0 && (bestWeek === null || week.count > bestWeek.count)) {
      bestWeek = { start: isoOf(week.start), end: isoOf(week.end), count: week.count };
    }
  }

  let bestMonth: FlameRecords["bestMonth"] = null;
  months.forEach((count, index) => {
    if (count > 0 && (bestMonth === null || count > bestMonth.count)) bestMonth = { month: index + 1, count };
  });

  return { longestStreak, bestDay, bestWeek, bestMonth };
}

interface InsightInput {
  year: number;
  counts: readonly number[];
  yearStart: number;
  firstDayIndex: number;
  contributions: number;
  activeDays: number;
  records: FlameRecords;
  previousContributions: number | null;
  previousIsFinished: boolean;
  yearIsFinished: boolean;
}

/** Deterministic, first match wins. Every sentence is derivable from the year's own calendar. */
function chooseInsight(input: InsightInput): FlameInsight {
  const { counts, contributions, activeDays, firstDayIndex } = input;
  const rules = FLAME_RULES;
  if (contributions === 0) return { id: "dormant" };

  const elapsed = counts.length - firstDayIndex;
  if (elapsed >= rules.unbroken.minElapsedDays && activeDays / elapsed >= rules.unbroken.minActiveRatio) {
    return { id: "unbroken" };
  }

  const windowDays = rules.accelerating.windowDays;
  if (elapsed >= windowDays * 2) {
    const sum = (from: number, to: number) => counts.slice(from, to).reduce((total, count) => total + count, 0);
    const last = sum(counts.length - windowDays, counts.length);
    const before = sum(counts.length - windowDays * 2, counts.length - windowDays);
    if (last >= rules.accelerating.minLastWindow && last >= before * rules.accelerating.minRatio) {
      return { id: "accelerating" };
    }
  }

  const { previousContributions } = input;
  if (
    input.yearIsFinished &&
    input.previousIsFinished &&
    previousContributions !== null &&
    previousContributions >= rules.growing.minPreviousYear &&
    contributions >= previousContributions * rules.growing.minRatio &&
    contributions - previousContributions >= rules.growing.minGain
  ) {
    return { id: "growing" };
  }

  let weekend = 0;
  let biggest = 0;
  counts.forEach((count, index) => {
    const dow = dayOfWeek(input.yearStart + index);
    if (dow === 0 || dow === 6) weekend += count;
    if (count > biggest) biggest = count;
  });
  const weekendShare = weekend / contributions;
  if (contributions >= rules.weekends.minContributions && weekendShare >= rules.weekends.minShare) {
    return { id: "weekends", percent: Math.round(weekendShare * 100) };
  }
  if (contributions >= rules.weekdays.minContributions && 1 - weekendShare >= rules.weekdays.minShare) {
    return { id: "weekdays", percent: Math.round((1 - weekendShare) * 100) };
  }

  if (contributions >= rules.singleBlaze.minContributions && biggest / contributions >= rules.singleBlaze.minShare) {
    return { id: "singleBlaze", percent: Math.round((biggest / contributions) * 100) };
  }

  if (contributions <= rules.embers.maxContributions) return { id: "embers" };
  return { id: "steady" };
}
