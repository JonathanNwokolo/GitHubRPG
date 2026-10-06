import type { DataCoverage } from "@/game/types";

/**
 * Output of buildDeveloperChronicle. Plain, serialisable data: no text, no UI, no language.
 * Sentences are composed later (chronicleText.ts) from the ids and numbers below, so every claim
 * in the Chronicle can be traced to a field here, and every field to the DeveloperProfile.
 */

/** Presentation only. Not a persistent mechanic and unrelated to achievement rarity. */
export type ChronicleRarity = "normal" | "important" | "exceptional";

export type ChronicleMetricKey = "contributions" | "commits" | "pullRequests" | "reviews" | "activeDays" | "issues";

export interface ChronicleMetric {
  key: ChronicleMetricKey;
  value: number;
  /** Never "unavailable": an unavailable figure is not emitted at all. */
  coverage: Exclude<DataCoverage, "unavailable">;
}

/** A fact the data justifies. `year` is the calendar year the fact belongs to. */
export type ChronicleHighlight =
  | { kind: "firstChapter"; year: number; rarity: ChronicleRarity; date: string }
  | { kind: "firstActivity"; year: number; rarity: ChronicleRarity; contributions: number }
  | {
      kind: "mostActiveYear";
      year: number;
      rarity: ChronicleRarity;
      contributions: number;
      /** Coverage is partial: "most active KNOWN year". */
      partial: boolean;
      /** It is the current, unfinished year: "so far". */
      inProgress: boolean;
    }
  | { kind: "peakCommits"; year: number; rarity: ChronicleRarity; commits: number }
  | { kind: "peakCollaboration"; year: number; rarity: ChronicleRarity; pullRequests: number; reviews: number }
  | {
      kind: "longestStreak";
      year: number;
      rarity: ChronicleRarity;
      days: number;
      /** "YYYY-MM-DD", inclusive. The fact is placed in the year the streak ended. */
      start: string;
      end: string;
      /** The streak is still alive at the reference date: it has not "ended". */
      ongoing: boolean;
    }
  | { kind: "growth"; year: number; rarity: ChronicleRarity; percent: number; previousYear: number; doubled: boolean }
  | { kind: "decline"; year: number; rarity: ChronicleRarity; percent: number; previousYear: number }
  | { kind: "return"; year: number; rarity: ChronicleRarity; dormantYears: number; contributions: number }
  | { kind: "milestone"; year: number; rarity: ChronicleRarity; threshold: number };

export type ChronicleHighlightKind = ChronicleHighlight["kind"];

/** Narrative names, assigned by deterministic rules (see CHRONICLE.md). */
export type ChronicleChapterId =
  | "journeyStart"
  | "firstSteps"
  | "rhythmGrows"
  | "greatAdvance"
  | "constructionSeason"
  | "collaborationEra"
  | "legendaryYear"
  | "returnToJourney"
  | "steadyMarch"
  | "historicMilestone"
  | "quietSeason"
  | "currentChapter";

export interface ChronicleYear {
  type: "year";
  year: number;
  chapter: ChronicleChapterId;
  rarity: ChronicleRarity;
  /** The year the account was created. */
  isStart: boolean;
  /** The year of the reference date. Its numbers are "so far": never projected. */
  isCurrent: boolean;
  /** Whether the data of this year could be read. false = nothing is claimed about it. */
  known: boolean;
  /** 0-4 figures, most relevant first. Zeros and unavailable figures are left out. */
  metrics: ChronicleMetric[];
  /** Every fact of this year, most important first. */
  highlights: ChronicleHighlight[];
}

/** A run of years collapsed because nothing in them is worth a chapter. */
export interface ChronicleInterlude {
  type: "interlude";
  fromYear: number;
  toYear: number;
  yearCount: number;
  /** null when some year of the run could not be read. */
  contributions: number | null;
  /** false when `contributions` is a lower bound (partial monthly series). */
  exact: boolean;
  /** True only when every year of the run is known and had no contribution at all. */
  quiet: boolean;
}

export type ChronicleEntry = ChronicleYear | ChronicleInterlude;

export interface ChronicleSummaryItem {
  value: number;
  coverage: Exclude<DataCoverage, "unavailable">;
}

export interface ChronicleSummary {
  /** Whole years, then the whole months left over. Computed from the full dates. */
  journeyLength: { years: number; months: number };
  /** Only when the most-active-year rule fired. */
  mostActiveYear: { year: number; contributions: number; coverage: ChronicleSummaryItem["coverage"] } | null;
  longestStreak: ChronicleSummaryItem | null;
  totalContributions: ChronicleSummaryItem | null;
}

/** What is true TODAY. Never presented as history. */
export interface ChroniclePresent {
  /** Highest-bytes language of the own repositories. */
  topLanguage: { name: string; coverage: ChronicleSummaryItem["coverage"] } | null;
  /** Stars on own repositories, only when there are enough to matter. */
  starsReceived: ChronicleSummaryItem | null;
}

export interface DeveloperChronicle {
  /** First name of displayName, else the username. Used in the opening sentence. */
  adventurerName: string;
  journeyStart: { date: string; year: number };
  /**
   * How much of the yearly history we know.
   * full: every year of the account was read; partial: only some (figures are "at least");
   * unavailable: no yearly history at all (only the account creation date is known).
   */
  coverage: DataCoverage;
  summary: ChronicleSummary;
  present: ChroniclePresent;
  /** The years that earned a chapter, chronological. The last one is the current year. */
  years: ChronicleYear[];
  /** Every highlight, chronological, then by importance. */
  highlights: ChronicleHighlight[];
  /** The current year's chapter (also the last item of `years`). */
  currentChapter: ChronicleYear;
  /** `years` plus the interludes between them: what the UI renders. */
  timeline: ChronicleEntry[];
}
