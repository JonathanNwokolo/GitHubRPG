import { getTranslation, type SupportedLanguage } from "@/i18n";
import { fill, formatCount, formatCoveredValue, formatNumber, localeOf } from "@/lib/format";
import { chapterOf } from "./highlights";
import type {
  ChronicleHighlight,
  ChronicleInterlude,
  ChronicleMetricKey,
  ChronicleRarity,
  ChronicleYear,
  DeveloperChronicle,
} from "./types";

/**
 * Presentation text of the Chronicle: turns the structured, language-free chronicle into sentences.
 * Pure (no React, no clock). Every sentence is a template of the dictionary filled ONLY with numbers and
 * names taken from the chronicle, so nothing can be said that the data did not state.
 */

type Chronicle = ReturnType<typeof getTranslation>["chronicle"];
type Units = Chronicle["units"];

const METRIC_UNIT: Record<ChronicleMetricKey, keyof Units> = {
  contributions: "contribution",
  commits: "commit",
  pullRequests: "pullRequest",
  reviews: "review",
  activeDays: "activeDay",
  issues: "issue",
};

export function formatChronicleDate(isoDate: string, language: SupportedLanguage): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(localeOf(language), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface MetricView {
  key: ChronicleMetricKey;
  /** "187" or "≥ 187". */
  value: string;
  /** Singular or plural: "commit" / "commits". */
  label: string;
}

export interface HighlightView {
  kind: ChronicleHighlight["kind"];
  rarity: ChronicleRarity;
  label: string;
  detail: string;
}

export interface YearView {
  year: number;
  title: string;
  /** The sentence of the fact that named the chapter. */
  description: string;
  metrics: MetricView[];
  /** The other facts of the year (the one that named the chapter is already the description). */
  highlights: HighlightView[];
  /** Set only when part of the history was not read and this year is one of the missing ones. */
  unknownNote: string | null;
}

export interface InterludeView {
  range: string;
  text: string;
}

export interface SummaryItemView {
  id: "journeyLength" | "mostActiveYear" | "longestStreak" | "totalContributions";
  label: string;
  value: string;
}

function mostActiveVariant(h: Extract<ChronicleHighlight, { kind: "mostActiveYear" }>): "mostActiveYear" | "mostActiveYearSoFar" | "mostActiveYearKnown" {
  if (h.partial) return "mostActiveYearKnown";
  return h.inProgress ? "mostActiveYearSoFar" : "mostActiveYear";
}

export function highlightLabel(highlight: ChronicleHighlight, language: SupportedLanguage): string {
  const labels = getTranslation(language).chronicle.labels;
  return highlight.kind === "mostActiveYear" ? labels[mostActiveVariant(highlight)] : labels[highlight.kind];
}

export function highlightDetail(
  highlight: ChronicleHighlight,
  chronicle: Pick<DeveloperChronicle, "adventurerName">,
  language: SupportedLanguage
): string {
  const t = getTranslation(language).chronicle;
  const u = t.units;
  const d = t.details;
  const count = (value: number, forms: Units[keyof Units]) => formatCount(value, forms, language);

  switch (highlight.kind) {
    case "firstChapter":
      return fill(d.firstChapter, { name: chronicle.adventurerName, date: formatChronicleDate(highlight.date, language) });
    case "firstActivity":
      return fill(d.firstActivity, { contributions: count(highlight.contributions, u.contribution) });
    case "mostActiveYear": {
      const key = highlight.partial
        ? highlight.inProgress
          ? "mostActiveYearKnownSoFar"
          : "mostActiveYearKnown"
        : highlight.inProgress
          ? "mostActiveYearSoFar"
          : "mostActiveYear";
      return fill(d[key], { contributions: count(highlight.contributions, u.contribution) });
    }
    case "peakCommits":
      return fill(d.peakCommits, { commits: count(highlight.commits, u.commit) });
    case "peakCollaboration": {
      // Name only what happened: "0 reviews" in a collaboration record is noise.
      const pullRequests = count(highlight.pullRequests, u.pullRequest);
      const reviews = count(highlight.reviews, u.review);
      if (highlight.reviews === 0) return fill(d.peakCollaborationPullRequests, { pullRequests });
      if (highlight.pullRequests === 0) return fill(d.peakCollaborationReviews, { reviews });
      return fill(d.peakCollaboration, { pullRequests, reviews });
    }
    case "longestStreak":
      return fill(highlight.ongoing ? d.longestStreakOngoing : d.longestStreak, {
        days: count(highlight.days, u.day),
        start: formatChronicleDate(highlight.start, language),
        end: formatChronicleDate(highlight.end, language),
      });
    case "growth":
      return fill(d.growth, { percent: formatNumber(highlight.percent, language), previousYear: highlight.previousYear });
    case "decline":
      return fill(d.decline, { percent: formatNumber(highlight.percent, language), previousYear: highlight.previousYear });
    case "return":
      return fill(d.return, {
        years: count(highlight.dormantYears, u.year),
        contributions: count(highlight.contributions, u.contribution),
      });
    case "milestone":
      return fill(d.milestone, { threshold: count(highlight.threshold, u.contribution) });
  }
}

export function describeYear(entry: ChronicleYear, chronicle: DeveloperChronicle, language: SupportedLanguage): YearView {
  const t = getTranslation(language).chronicle;

  const primary = entry.highlights.find((h) =>
    entry.chapter === "journeyStart" ? h.kind === "firstChapter" : chapterOf(h) === entry.chapter
  );

  const sentences: string[] = [];
  if (primary) sentences.push(highlightDetail(primary, chronicle, language));
  if (entry.isCurrent) sentences.push(t.details.current);

  return {
    year: entry.year,
    title: t.chapters[entry.chapter],
    description: sentences.join(" "),
    metrics: entry.metrics.map((metric) => {
      const forms = t.units[METRIC_UNIT[metric.key]];
      return {
        key: metric.key,
        value: formatCoveredValue(metric.value, metric.coverage, language),
        label: forms[metric.value === 1 ? "one" : "other"],
      };
    }),
    highlights: entry.highlights
      .filter((h) => h !== primary)
      .map((h) => ({
        kind: h.kind,
        rarity: h.rarity,
        label: highlightLabel(h, language),
        detail: highlightDetail(h, chronicle, language),
      })),
    unknownNote: !entry.known && chronicle.coverage === "partial" ? t.coverage.yearUnknown : null,
  };
}

export function describeInterlude(entry: ChronicleInterlude, language: SupportedLanguage): InterludeView {
  const t = getTranslation(language).chronicle;
  const range = entry.fromYear === entry.toYear ? String(entry.fromYear) : `${entry.fromYear}–${entry.toYear}`;
  if (entry.contributions === null) return { range, text: t.interlude.unknown };
  if (entry.quiet) return { range, text: t.interlude.quiet };
  const contributions = formatCount(entry.contributions, t.units.contribution, language, entry.exact ? "full" : "partial");
  if (entry.yearCount === 1) return { range, text: fill(t.interlude.singleYear, { contributions }) };
  return {
    range,
    text: fill(t.interlude.activity, { contributions, years: formatCount(entry.yearCount, t.units.year, language) }),
  };
}

/** The four figures of the whole journey. A figure that is unavailable (or has no fact behind it) is left out. */
export function describeSummary(chronicle: DeveloperChronicle, language: SupportedLanguage): SummaryItemView[] {
  const t = getTranslation(language).chronicle;
  const { summary } = chronicle;
  const items: SummaryItemView[] = [];

  const { years, months } = summary.journeyLength;
  items.push({
    id: "journeyLength",
    label: t.summary.journeyLength,
    value:
      years >= 1
        ? formatCount(years, t.units.year, language)
        : months >= 1
          ? formatCount(months, t.units.month, language)
          : t.summary.lessThanAMonth,
  });

  if (summary.mostActiveYear) {
    items.push({
      id: "mostActiveYear",
      label: summary.mostActiveYear.coverage === "partial" ? t.summary.mostActiveYearKnown : t.summary.mostActiveYear,
      value: String(summary.mostActiveYear.year),
    });
  }

  if (summary.longestStreak) {
    items.push({
      id: "longestStreak",
      label: t.summary.longestStreak,
      value: formatCount(summary.longestStreak.value, t.units.day, language, summary.longestStreak.coverage),
    });
  }

  if (summary.totalContributions) {
    const { value, coverage } = summary.totalContributions;
    items.push({
      id: "totalContributions",
      label: coverage === "partial" ? t.summary.totalContributionsKnown : t.summary.totalContributions,
      value: formatCoveredValue(value, coverage, language),
    });
  }
  return items;
}

/** Sentences about TODAY (never history), or [] when there is nothing worth saying. */
export function describePresent(chronicle: DeveloperChronicle, language: SupportedLanguage): string[] {
  const t = getTranslation(language).chronicle;
  const { topLanguage, starsReceived } = chronicle.present;
  const lines: string[] = [];
  if (topLanguage) {
    lines.push(fill(topLanguage.coverage === "partial" ? t.present.topLanguageKnown : t.present.topLanguage, { language: topLanguage.name }));
  }
  if (starsReceived) {
    lines.push(
      fill(starsReceived.coverage === "partial" ? t.present.starsKnown : t.present.stars, {
        stars: formatCount(starsReceived.value, t.units.star, language),
      })
    );
  }
  return lines;
}
