import type { DataCoverage } from "@/game/types";
import type { FlameCalendarInput } from "../buildActivityFlame";

/**
 * Test-only builders for the "Chama da Atividade". They produce plain calendars; they are NOT personas and are never
 * reachable from the UI or from the data sources.
 */

const DAY_MS = 86_400_000;

export const REFERENCE = "2026-10-09T00:00:00Z";
export const CREATED_LONG_AGO = "2019-02-14T00:00:00Z";

/**
 * Dense per-day counts of one year (index 0 = January 1st), ending at `lastIso` (or December 31st).
 * `at` receives each day's ISO date, day of week (0 = Sunday) and index, and returns that day's contributions.
 */
export function dayCounts(
  year: number,
  lastIso: string | null,
  at: (iso: string, dow: number, index: number) => number
): number[] {
  const start = Date.UTC(year, 0, 1);
  const end = lastIso === null ? Date.UTC(year, 11, 31) : Date.parse(`${lastIso}T00:00:00Z`);
  const length = Math.round((end - start) / DAY_MS) + 1;
  return Array.from({ length }, (_, index) => {
    const date = new Date(start + index * DAY_MS);
    return at(date.toISOString().slice(0, 10), date.getUTCDay(), index);
  });
}

/** A year where only the listed dates ("YYYY-MM-DD" -> contributions) are active. */
export function sparseYear(year: number, entries: Record<string, number>, lastIso: string | null = null): number[] {
  return dayCounts(year, lastIso, (iso) => entries[iso] ?? 0);
}

/** A year that is the same every day. */
export function flatYear(year: number, perDay: number, lastIso: string | null = null): number[] {
  return dayCounts(year, lastIso, () => perDay);
}

export function calendarOf(
  years: Record<number, number[]>,
  coverage: DataCoverage = "full"
): FlameCalendarInput {
  return {
    years: Object.entries(years)
      .map(([year, counts]) => ({ year: Number(year), counts }))
      .sort((a, b) => a.year - b.year),
    coverage,
  };
}
