import { fill, formatNumber } from "@/lib/format";
import type { SupportedLanguage, TranslationDictionary } from "@/i18n";
import type { ThresholdProgress } from "@/game/types";

/**
 * Turns the engine's ThresholdProgress into text. It only chooses WORDS:
 * whether something is unlocked, exact, partial or missing is decided by the engine.
 */
export type ProgressState = "unlocked" | "exact" | "partial" | "unavailable";

export interface ProgressView {
  state: ProgressState;
  /** Main line, e.g. "437 / 1.000 stars" or "At least 240 commits found". */
  headline: string;
  /** Secondary line, e.g. "Faltam 563 stars". Absent when we cannot say what is missing. */
  detail?: string;
  /** Explains partial coverage. */
  note?: string;
  /** Bar fill, or null when there is no honest number to draw. */
  barPercent: number | null;
}

function describeYears(years: number, t: TranslationDictionary["progress"]): string {
  const totalMonths = Math.max(1, Math.round(years * 12));
  const wholeYears = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const unit = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts: string[] = [];
  if (wholeYears > 0) parts.push(unit(wholeYears, t.year, t.years));
  if (months > 0) parts.push(unit(months, t.month, t.months));
  return parts.join(` ${t.and} `);
}

export function describeProgress(
  progress: ThresholdProgress,
  t: TranslationDictionary,
  language: SupportedLanguage
): ProgressView {
  const unit = t.units[progress.unit];
  const target = formatNumber(progress.target, language);

  if (progress.coverage === "unavailable" || progress.current === null) {
    return { state: "unavailable", headline: t.progress.unavailable, barPercent: null };
  }

  const current = formatNumber(progress.current, language);

  if (progress.unlocked) {
    return {
      state: "unlocked",
      headline:
        progress.coverage === "partial"
          ? fill(t.progress.atLeast, { n: current, unit })
          : fill(t.progress.reached, { target, unit }),
      note: progress.coverage === "partial" ? t.progress.partialUnlockedNote : undefined,
      barPercent: 100,
    };
  }

  if (progress.coverage === "partial") {
    // We only know a lower bound: say what was found, never what is missing.
    return {
      state: "partial",
      headline: fill(t.progress.atLeast, { n: current, unit }),
      detail: fill(t.progress.goal, { target, unit }),
      note: t.progress.partialNote,
      barPercent: null,
    };
  }

  const remaining = progress.remaining;
  const detail =
    remaining === null
      ? undefined
      : progress.unit === "years"
        ? fill(t.progress.remainingYears, { n: describeYears(remaining, t.progress) })
        : fill(t.progress.remaining, { n: formatNumber(remaining, language), unit });

  return {
    state: "exact",
    headline: fill(t.progress.current, { current, target, unit }),
    detail,
    barPercent: progress.progressPercent,
  };
}
