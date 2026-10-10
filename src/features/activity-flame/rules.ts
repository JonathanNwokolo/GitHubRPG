/** Every threshold of the "Chama da Atividade" lives here (presentation only; nothing feeds the Game Engine). */
export const FLAME_RULES = {
  /**
   * Energy levels. The relative cutoffs are percentiles of the hero's own active days (every read year together,
   * so years stay comparable). The absolute floors cap them: a quiet profile never lights its top level
   * with one or two contributions.
   */
  levelPercentiles: [0.25, 0.5, 0.75, 0.95],
  /** Minimum contributions in a day for level 1..5. */
  levelFloors: [1, 2, 4, 7, 10],

  /** Insights, checked in priority order (first match wins). */
  unbroken: { minElapsedDays: 30, minActiveRatio: 0.8 },
  /** Last window vs the one before it, both inside the year. */
  accelerating: { windowDays: 90, minRatio: 1.5, minLastWindow: 40 },
  /** Year over year; only between two finished years that were both read. */
  growing: { minPreviousYear: 20, minRatio: 1.25, minGain: 50 },
  weekends: { minContributions: 30, minShare: 0.4 },
  weekdays: { minContributions: 30, minShare: 0.85 },
  singleBlaze: { minContributions: 40, minShare: 0.25 },
  embers: { maxContributions: 29 },
} as const;
