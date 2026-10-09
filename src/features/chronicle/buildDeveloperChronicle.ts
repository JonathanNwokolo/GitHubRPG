import { calculateAccountAge } from "@/game/age";
import { analyzeLanguages } from "@/game/languages";
import type { DeveloperProfile } from "@/game/types";
import { chapterOf, detectHighlights, type DetectionContext } from "./highlights";
import { CHRONICLE_RULES as RULES } from "./rules";
import type {
  ChronicleChapterId,
  ChronicleEntry,
  ChronicleHighlight,
  ChronicleInterlude,
  ChronicleMetric,
  ChroniclePresent,
  ChronicleRarity,
  ChronicleSummary,
  ChronicleYear,
  DeveloperChronicle,
} from "./types";
import { collectYearHistory, type YearHistory, type YearStats } from "./yearStats";

const MAX_METRICS = 4;
const RARITY_RANK: Record<ChronicleRarity, number> = { normal: 0, important: 1, exceptional: 2 };

/** Calendar months from `from` to `to`, whole months only (the day of the month counts). */
function wholeMonthsBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  const anchor = Date.UTC(
    a.getUTCFullYear(),
    a.getUTCMonth() + months,
    a.getUTCDate(),
    a.getUTCHours(),
    a.getUTCMinutes(),
    a.getUTCSeconds(),
    a.getUTCMilliseconds()
  );
  if (anchor > b.getTime()) months--;
  return Math.max(0, months);
}

function journeyLength(profile: DeveloperProfile): ChronicleSummary["journeyLength"] {
  const { wholeYears } = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
  const totalMonths = wholeMonthsBetween(profile.accountCreatedAt, profile.referenceDate);
  return { years: wholeYears, months: Math.min(11, Math.max(0, totalMonths - wholeYears * 12)) };
}

function adventurerName(profile: DeveloperProfile): string {
  return profile.displayName?.trim() || profile.username;
}

/**
 * Up to MAX_METRICS figures of a year, in a fixed order. Zeros are not worth a line and figures the source
 * does not have (null) are never invented, so a mock-style profile shows only contributions.
 */
function yearMetrics(stat: YearStats | undefined): ChronicleMetric[] {
  if (!stat) return [];
  const ordered: Array<[ChronicleMetric["key"], number | null]> = [
    ["contributions", stat.contributions],
    ["commits", stat.commits],
    ["pullRequests", stat.pullRequests],
    ["reviews", stat.reviews],
    ["activeDays", stat.activeDays],
    ["issues", stat.issues],
  ];
  const metrics: ChronicleMetric[] = [];
  for (const [key, value] of ordered) {
    if (value === null || (value === 0 && key !== "contributions")) continue;
    metrics.push({ key, value, coverage: stat.coverage });
  }
  return metrics.slice(0, MAX_METRICS);
}

function buildYear(
  year: number,
  highlights: ChronicleHighlight[],
  history: YearHistory,
  createdYear: number,
  currentYear: number
): ChronicleYear {
  const isStart = year === createdYear;
  const isCurrent = year === currentYear;
  const named = highlights.map(chapterOf).find((chapter) => chapter !== null) ?? null;
  // Every chapter year other than the first and the current one exists because of a highlight that names it.
  const chapter: ChronicleChapterId = isStart ? "journeyStart" : isCurrent ? "currentChapter" : (named ?? "firstSteps");
  const rarity = highlights.reduce<ChronicleRarity>(
    (best, h) => (RARITY_RANK[h.rarity] > RARITY_RANK[best] ? h.rarity : best),
    isStart || isCurrent ? "important" : "normal"
  );
  const stat = history.stats.get(year);
  return {
    type: "year",
    year,
    chapter,
    rarity,
    isStart,
    isCurrent,
    known: stat !== undefined,
    metrics: yearMetrics(stat),
    highlights,
  };
}

/** The runs of years between two chapters, collapsed into one line of facts. */
function buildInterlude(fromYear: number, toYear: number, history: YearHistory): ChronicleInterlude {
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);
  const stats = years.map((year) => history.stats.get(year));
  const allKnown = stats.every((stat) => stat !== undefined);
  const contributions = allKnown ? stats.reduce((sum, stat) => sum + (stat?.contributions ?? 0), 0) : null;
  const exact = stats.every((stat) => stat?.coverage === "full");
  return {
    type: "interlude",
    fromYear,
    toYear,
    yearCount: years.length,
    contributions,
    exact,
    quiet: allKnown && exact && contributions === 0,
  };
}

function buildSummary(
  profile: DeveloperProfile,
  history: YearHistory,
  highlights: ChronicleHighlight[]
): ChronicleSummary {
  const mostActive = highlights.find((h) => h.kind === "mostActiveYear");
  const streak = profile.activity.longestStreakDays;
  const known = [...history.stats.values()];

  return {
    journeyLength: journeyLength(profile),
    mostActiveYear:
      mostActive?.kind === "mostActiveYear"
        ? { year: mostActive.year, contributions: mostActive.contributions, coverage: mostActive.partial ? "partial" : "full" }
        : null,
    longestStreak:
      streak.coverage === "unavailable" || streak.value <= 0 ? null : { value: streak.value, coverage: streak.coverage },
    totalContributions:
      history.coverage === "unavailable"
        ? null
        : { value: known.reduce((sum, stat) => sum + stat.contributions, 0), coverage: history.coverage },
  };
}

/** Only facts about TODAY (current snapshots), kept apart from the year-by-year history. */
function buildPresent(profile: DeveloperProfile): ChroniclePresent {
  const top =
    profile.languagesCoverage === "unavailable" ? undefined : analyzeLanguages(profile.languages).languages[0];
  const stars = profile.starsReceived;
  return {
    topLanguage: top && profile.languagesCoverage !== "unavailable" ? { name: top.name, coverage: profile.languagesCoverage } : null,
    starsReceived:
      stars.coverage !== "unavailable" && stars.value >= RULES.minPublicImpactStars
        ? { value: stars.value, coverage: stars.coverage }
        : null,
  };
}

/**
 * DeveloperProfile -> the story of its public history, as data. Pure and deterministic: the same profile
 * (referenceDate included) always gives the same chronicle. It never reads the clock, randomness or the network,
 * never recomputes XP, level, class or skills, and states a fact only when the per-year data proves it.
 * Rules and thresholds: rules.ts and CHRONICLE.md.
 */
export function buildDeveloperChronicle(profile: DeveloperProfile): DeveloperChronicle {
  const history = collectYearHistory(profile);
  const createdYear = history.accountYears[0];
  const currentYear = history.accountYears[history.accountYears.length - 1];
  const ctx: DetectionContext = { profile, history, createdYear, currentYear };

  const highlights = detectHighlights(ctx);
  const byYear = new Map<number, ChronicleHighlight[]>();
  for (const highlight of highlights) byYear.set(highlight.year, [...(byYear.get(highlight.year) ?? []), highlight]);

  // A year earns a chapter when it opens the journey, is the current one, or has a fact to tell.
  const chapterYears = history.accountYears.filter((year) => year === createdYear || year === currentYear || byYear.has(year));
  const years = chapterYears.map((year) => buildYear(year, byYear.get(year) ?? [], history, createdYear, currentYear));

  const timeline: ChronicleEntry[] = [];
  years.forEach((entry, index) => {
    const previous = years[index - 1];
    if (previous && history.coverage !== "unavailable" && entry.year - previous.year > 1) {
      timeline.push(buildInterlude(previous.year + 1, entry.year - 1, history));
    }
    timeline.push(entry);
  });

  return {
    adventurerName: adventurerName(profile),
    journeyStart: { date: new Date(profile.accountCreatedAt).toISOString().slice(0, 10), year: createdYear },
    coverage: history.coverage,
    summary: buildSummary(profile, history, highlights),
    present: buildPresent(profile),
    years,
    highlights,
    currentChapter: years[years.length - 1],
    timeline,
  };
}
