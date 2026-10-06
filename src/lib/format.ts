import type { DataCoverage, Metric } from "@/game/types";
import type { SupportedLanguage } from "@/i18n";

/** Presentation helpers only. Nothing here decides game outcomes. */

export function localeOf(language: SupportedLanguage): string {
  return language === "pt-BR" ? "pt-BR" : "en-US";
}

/** Replaces {name} placeholders. Unknown placeholders are left untouched. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export function formatNumber(value: number, language: SupportedLanguage): string {
  return value.toLocaleString(localeOf(language), { maximumFractionDigits: 1 });
}

/**
 * How a metric should read given what we know about it:
 * full -> "1.240", partial -> "≥ 1.240", unavailable -> "—".
 */
export function formatMetric(metric: Metric, language: SupportedLanguage): string {
  return formatCoveredValue(metric.value, metric.coverage, language);
}

export function formatCoveredValue(value: number, coverage: DataCoverage, language: SupportedLanguage): string {
  if (coverage === "unavailable") return "—";
  const text = formatNumber(value, language);
  return coverage === "partial" ? `≥ ${text}` : text;
}
