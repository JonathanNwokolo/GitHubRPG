import { getTranslation, type SupportedLanguage } from "@/i18n";
import { fill, formatNumber, localeOf, pluralize } from "@/lib/format";
import type { FlameInsight, FlameLevel, FlameRun } from "./types";

/**
 * Presentation text of the "Chama da Atividade". Pure (no React, no clock). Every sentence is a dictionary template
 * filled only with values taken from the model.
 */

type Flame = ReturnType<typeof getTranslation>["activityFlame"];

export function flameDictionary(language: SupportedLanguage): Flame {
  return getTranslation(language).activityFlame;
}

/** "15 de março de 2026" / "March 15, 2026". */
export function formatFlameDate(isoDate: string, language: SupportedLanguage): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(localeOf(language), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "15 mar" / "Mar 15": for ranges inside one year view. */
export function formatFlameShortDate(isoDate: string, language: SupportedLanguage): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(localeOf(language), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "março" / "March". `month` is 1-12. */
export function formatFlameMonth(month: number, language: SupportedLanguage): string {
  return new Date(Date.UTC(2001, month - 1, 1)).toLocaleDateString(localeOf(language), {
    month: "long",
    timeZone: "UTC",
  });
}

export function flameLevelName(level: FlameLevel, language: SupportedLanguage): string {
  return flameDictionary(language).levels[level];
}

/** "148 dias", or "≥ 148 dias" when the figure is a lower bound. */
export function formatFlameDays(days: number, exact: boolean, language: SupportedLanguage): string {
  const units = flameDictionary(language).units.day;
  const text = `${formatNumber(days, language)} ${pluralize(days, units)}`;
  return exact ? text : `≥ ${text}`;
}

export function formatFlameContributions(count: number, language: SupportedLanguage): string {
  const units = flameDictionary(language).units.contribution;
  return `${formatNumber(count, language)} ${pluralize(count, units)}`;
}

export function describeFlameInsight(insight: FlameInsight, language: SupportedLanguage): string {
  const template = flameDictionary(language).oracle.sentences[insight.id];
  return fill(template, { percent: insight.percent ?? 0 });
}

export function describeFlameRange(run: Pick<FlameRun, "start" | "end">, language: SupportedLanguage): string {
  return fill(flameDictionary(language).records.range, {
    start: formatFlameShortDate(run.start, language),
    end: formatFlameShortDate(run.end, language),
  });
}
