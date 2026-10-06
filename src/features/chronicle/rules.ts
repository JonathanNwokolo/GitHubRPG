/**
 * Every threshold of the Chronicle. Presentation rules ONLY: they decide which true facts are worth
 * telling, never what the Game Engine computes (no XP, level, class or skill reads them).
 * Documented in CHRONICLE.md.
 *
 * "Score" of a year = its contributions (every contribution in GitHub's calendar of that year).
 * No weights: the number is GitHub's own and exists whenever the history does.
 */
export const CHRONICLE_RULES = {
  /** A "peak" (most active year, commits record, collaboration record) needs at least this much to mean something. */
  minPeakContributions: 100,
  minPeakCommits: 100,
  /** Pull requests + reviews in one year. Below this it is participation, not mastery. */
  minPeakCollaboration: 40,
  /**
   * A peak only exists when at least this many years have any such activity. Two years are not a record: one of
   * them is usually a partial year (creation or current), so "the best" would mean little.
   */
  minYearsToCompare: 3,

  /** A streak shorter than this is not an event. */
  minStreakDays: 7,

  /** Year-over-year, between two COMPLETE calendar years only. */
  growth: {
    /** Needs a real base: growing from ~nothing is a return or a first step, not growth. */
    minPrevious: 20,
    /** +50% or more... */
    minRatio: 1.5,
    /** ...and at least this many more contributions (a +60% of 25 is noise). */
    minIncrease: 50,
    /** At least double: the "greatAdvance" chapter. */
    doubledRatio: 2,
  },
  decline: {
    minPrevious: 100,
    /** Half or less of the previous year. */
    maxRatio: 0.5,
    // Consecutive declines are one story: only the first year of a run is told.
  },

  /** A year with at most this many contributions counts as "quiet" for the return rule. */
  dormantMaxContributions: 20,
  /** Consecutive complete years that must be quiet before a return can exist. */
  dormantMinYears: 2,
  /** The profile must have had a year this active BEFORE the quiet period (otherwise it never left, it just started). */
  returnMinActiveBefore: 100,
  /** The year right after the quiet period must be at least this active. */
  returnMinContributions: 100,

  /** Cumulative contributions; the highest one reached becomes a historic milestone. */
  milestones: [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000],

  /** Present-tense snapshot: stars on own repositories worth mentioning. */
  minPublicImpactStars: 50,
} as const;
