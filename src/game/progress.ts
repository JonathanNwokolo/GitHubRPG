import type { AccountAge } from "./age";
import type { LanguageAnalysis } from "./languages";
import { ceilTo, floorTo } from "./math";
import type { DeveloperProfile, Metric, MetricUnit, ThresholdProgress } from "./types";

/** Every counter a threshold goal can read, keyed by unit. Built once per character. */
export type ProgressMetrics = Record<MetricUnit, Metric>;

export function buildProgressMetrics(
  profile: DeveloperProfile,
  languages: LanguageAnalysis,
  age: AccountAge
): ProgressMetrics {
  return {
    commits: profile.commits,
    pullRequests: profile.pullRequests,
    reviews: profile.reviews,
    issues: profile.issues,
    repositories: profile.ownRepositories,
    stars: profile.starsReceived,
    languages: { value: languages.relevant.length, coverage: profile.languagesCoverage },
    years: { value: age.years, coverage: "full" },
  };
}

/** Years are shown with one decimal; everything else is an integer count. */
function decimalsFor(unit: MetricUnit): number {
  return unit === "years" ? 1 : 0;
}

/**
 * The single rule for goal progress (achievements and titles).
 *  - unlocked as soon as the observed value reaches the target, even with partial data;
 *  - exact percentage / remaining only when coverage is "full";
 *  - partial & locked: we only know a lower bound, so we do NOT say what is missing;
 *  - unavailable: nothing is invented.
 * Values are rounded in the conservative direction (current down, remaining up),
 * so a locked goal never displays as complete.
 */
export function evaluateThreshold(
  metric: Metric,
  target: number,
  unit: MetricUnit
): ThresholdProgress {
  const { coverage } = metric;
  const base = { unit, target, coverage };

  if (coverage === "unavailable") {
    return { ...base, current: null, unlocked: false, progressPercent: null, remaining: null };
  }

  const decimals = decimalsFor(unit);
  const current = floorTo(metric.value, decimals);
  const unlocked = metric.value >= target;

  if (unlocked) {
    return { ...base, current, unlocked: true, progressPercent: 100, remaining: 0 };
  }

  if (coverage === "partial") {
    return { ...base, current, unlocked: false, progressPercent: null, remaining: null };
  }

  return {
    ...base,
    current,
    unlocked: false,
    progressPercent: floorTo((metric.value / target) * 100, 1),
    remaining: ceilTo(target - metric.value, decimals),
  };
}

/** value/target in [0, 1], ignoring coverage. Only used to RANK goals, never displayed. */
export function progressRatio(progress: ThresholdProgress): number {
  if (progress.current === null || progress.target <= 0) return 0;
  return Math.min(1, progress.current / progress.target);
}
