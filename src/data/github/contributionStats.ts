/**
 * Pure helpers over GitHub's per-day contribution calendar. No I/O, no clock:
 * the reference date is always passed in.
 *
 * Dates are calendar days ("YYYY-MM-DD") exactly as GitHub reports them; all arithmetic is UTC day counting.
 */

export interface ContributionDay {
  /** "YYYY-MM-DD" */
  date: string;
  count: number;
}

export interface ActivitySummary {
  activeDays: number;
  longestStreakDays: number;
  currentStreakDays: number;
  recentActiveDays: number;
  /** Contributions per month, creation month .. reference month inclusive. */
  monthlyContributions: number[];
}

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since the Unix epoch for a "YYYY-MM-DD" (or ISO timestamp, date part only). */
export function toDayNumber(date: string): number {
  const match = DATE_PATTERN.exec(date.slice(0, 10));
  if (!match) throw new Error(`Invalid calendar date: ${date}`);
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
}

/** Sorted, de-duplicated day numbers of the days with at least one contribution. */
function activeDayNumbers(days: readonly ContributionDay[]): number[] {
  const unique = new Set<number>();
  for (const day of days) if (day.count > 0) unique.add(toDayNumber(day.date));
  return [...unique].sort((a, b) => a - b);
}

/** Longest run of consecutive active days. 0 when there are none. */
export function computeLongestStreak(activeDays: readonly number[]): number {
  let longest = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of activeDays) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    previous = day;
  }
  return longest;
}

/**
 * Streak ending at the reference day. If the reference day itself has no contribution yet
 * the streak may still be alive through the day before (the day is not over), so it starts there.
 */
export function computeCurrentStreak(activeDays: readonly number[], referenceDay: number): number {
  const set = new Set(activeDays);
  let day = set.has(referenceDay) ? referenceDay : referenceDay - 1;
  let streak = 0;
  while (set.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

function monthIndex(date: string, firstYear: number, firstMonth: number): number {
  const match = DATE_PATTERN.exec(date.slice(0, 10));
  if (!match) throw new Error(`Invalid calendar date: ${date}`);
  return (Number(match[1]) - firstYear) * 12 + (Number(match[2]) - 1 - firstMonth);
}

/**
 * Whole-history summary. Days after `referenceDate` are ignored (the calendar's current week
 * can contain future days); days before the creation month are ignored by the monthly series only.
 * Duplicate dates are summed for the monthly series and counted once as an active day.
 */
export function summarizeActivity(
  days: readonly ContributionDay[],
  options: { createdAt: string; referenceDate: string; recentWindowDays: number }
): ActivitySummary {
  const referenceDay = toDayNumber(options.referenceDate);
  const upToReference = days.filter((day) => toDayNumber(day.date) <= referenceDay);
  const active = activeDayNumbers(upToReference);

  const recentStart = referenceDay - options.recentWindowDays + 1;
  const recentActiveDays = active.filter((day) => day >= recentStart).length;

  const createdYear = Number(options.createdAt.slice(0, 4));
  const createdMonth = Number(options.createdAt.slice(5, 7)) - 1;
  const monthly = new Array<number>(Math.max(1, monthIndex(options.referenceDate, createdYear, createdMonth) + 1)).fill(0);
  for (const day of upToReference) {
    const index = monthIndex(day.date, createdYear, createdMonth);
    if (index >= 0 && index < monthly.length) monthly[index] += day.count;
  }

  return {
    activeDays: active.length,
    longestStreakDays: computeLongestStreak(active),
    currentStreakDays: computeCurrentStreak(active, referenceDay),
    recentActiveDays,
    monthlyContributions: monthly,
  };
}

/** "YYYY-MM-DD" of a day number (inverse of toDayNumber). */
function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export interface StreakPeriod {
  /** "YYYY-MM-DD", inclusive. */
  start: string;
  end: string;
  length: number;
}

/**
 * Where the longest run of consecutive active days happened. Same run `computeLongestStreak` measures:
 * on a tie the EARLIEST run wins. Days after `referenceDate` are ignored. null when there is no active day.
 */
export function findLongestStreakPeriod(days: readonly ContributionDay[], referenceDate: string): StreakPeriod | null {
  const referenceDay = toDayNumber(referenceDate);
  const active = activeDayNumbers(days.filter((day) => toDayNumber(day.date) <= referenceDay));

  let best: { startDay: number; endDay: number; length: number } | null = null;
  let runStart = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of active) {
    if (previous !== null && day === previous + 1) {
      run++;
    } else {
      run = 1;
      runStart = day;
    }
    if (best === null || run > best.length) best = { startDay: runStart, endDay: day, length: run };
    previous = day;
  }
  return best && { start: fromDayNumber(best.startDay), end: fromDayNumber(best.endDay), length: best.length };
}

export interface YearSummary {
  contributions: number;
  activeDays: number;
}

/** Totals of ONE year's calendar. Days after `referenceDate` (the padded current week) are ignored. */
export function summarizeYearDays(days: readonly ContributionDay[], referenceDate: string): YearSummary {
  const referenceDay = toDayNumber(referenceDate);
  let contributions = 0;
  const active = new Set<number>();
  for (const day of days) {
    const dayNumber = toDayNumber(day.date);
    if (dayNumber > referenceDay) continue;
    contributions += day.count;
    if (day.count > 0) active.add(dayNumber);
  }
  return { contributions, activeDays: active.size };
}
