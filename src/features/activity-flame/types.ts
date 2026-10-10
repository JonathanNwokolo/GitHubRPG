import type { DataCoverage } from "@/game/types";

/**
 * Language-free model of the "Chama da Atividade" section. Plain data (no text, no UI, no clock), built once on the
 * server from the per-day contribution calendar GitHub already returned, so it serializes to the client as is.
 * Presentation only: nothing here feeds the Game Engine.
 */

/** 0 = no activity .. 5 = legendary. */
export type FlameLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** A run of consecutive active days ("YYYY-MM-DD", inclusive). */
export interface FlameRun {
  start: string;
  end: string;
  days: number;
  /**
   * false when the run touches a boundary of unread history, so `days` is a lower bound
   * (a partially read account: an absent year is never treated as zero).
   */
  exact: boolean;
}

export interface FlameRecords {
  longestStreak: FlameRun | null;
  /** The single most active day. */
  bestDay: { date: string; count: number } | null;
  /** The most active calendar week (Sunday to Saturday, as drawn by the heatmap), clipped to the year. */
  bestWeek: { start: string; end: string; count: number } | null;
  /** The most active calendar month. `month` is 1-12. */
  bestMonth: { month: number; count: number } | null;
}

export type FlameInsightId =
  | "dormant"
  | "unbroken"
  | "accelerating"
  | "growing"
  | "weekends"
  | "weekdays"
  | "singleBlaze"
  | "embers"
  | "steady";

export interface FlameInsight {
  id: FlameInsightId;
  /** Share (0-100) of the contributions the sentence is about, when it states one. */
  percent?: number;
}

export interface FlameYear {
  year: number;
  /** Contributions per day, index 0 = January 1st. Ends at December 31st, or at the reference date. */
  counts: number[];
  /** First day (index) the hero existed: earlier cells of the creation year are drawn as "before the journey". */
  firstDayIndex: number;
  /** The year of the reference date: still in progress. */
  inProgress: boolean;
  stats: {
    contributions: number;
    activeDays: number;
    longestStreak: FlameRun | null;
    /** Streak alive at the end of the view (today for the year in progress, December 31st otherwise). */
    endStreak: { days: number; exact: boolean };
  };
  records: FlameRecords;
  insight: FlameInsight;
}

export interface ActivityFlameModel {
  /** full: every year of the account read. partial: some years absent. unavailable: no calendar at all. */
  coverage: DataCoverage;
  /** Years ascending. Only years that were really read: an unread year is absent, never an empty one. */
  years: FlameYear[];
  /** The most recent read year, or null without a calendar. */
  defaultYear: number | null;
  /** Upper bound (inclusive) of the counts of levels 1..4; anything above is level 5. Shared by every year. */
  cutoffs: number[];
  /** Whole history read: contributions of every read year. 0 = the calendar exists but nothing was ever lit. */
  totalContributions: number;
}
