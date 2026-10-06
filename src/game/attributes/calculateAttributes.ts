import type { AccountAge } from "../age";
import {
  ACTIVITY_RECENT_BONUS,
  CONSISTENCY_DISTRIBUTION_WEIGHTS,
  CONSISTENCY_MATURITY_MONTHS,
  REFERENCE,
  STAT_WEIGHTS,
} from "../constants";
import type { LanguageAnalysis } from "../languages";
import { clamp01, logNormalize, normalizedEntropy, toStat } from "../math";
import type { DeveloperProfile, RPGStats } from "../types";

/**
 * Activity: lifetime volume is the base; recent activity can only add a small
 * bonus on the remaining headroom (it never replaces history).
 */
export function calculateActivity(profile: DeveloperProfile): number {
  const w = STAT_WEIGHTS.activity;
  const base =
    logNormalize(profile.commits.value, REFERENCE.commits) * w.commits +
    logNormalize(profile.pullRequests.value, REFERENCE.pullRequests) * w.pullRequests +
    logNormalize(profile.issues.value, REFERENCE.issues) * w.issues +
    logNormalize(profile.reviews.value, REFERENCE.reviews) * w.reviews +
    logNormalize(profile.activity.activeDays.value, REFERENCE.activeDays) * w.activeDays;

  const recent = clamp01(profile.activity.recentActiveDays.value / REFERENCE.recentActiveDays);
  return toStat(base + ACTIVITY_RECENT_BONUS * recent * (1 - base));
}

/** Account age is linear (age / 15y) and only 20% of the stat, so age alone never reaches 100. */
export function calculateExperience(profile: DeveloperProfile, age: AccountAge): number {
  const w = STAT_WEIGHTS.experience;
  return toStat(
    clamp01(age.years / REFERENCE.accountAgeYears) * w.accountAge +
      logNormalize(profile.ownRepositories.value, REFERENCE.ownRepositories) * w.repositories +
      logNormalize(profile.pullRequests.value, REFERENCE.pullRequests) * w.pullRequests +
      logNormalize(profile.reviews.value, REFERENCE.reviews) * w.reviews +
      logNormalize(profile.issues.value, REFERENCE.issues) * w.issues
  );
}

export function calculateReputation(profile: DeveloperProfile): number {
  const w = STAT_WEIGHTS.reputation;
  return toStat(
    logNormalize(profile.starsReceived.value, REFERENCE.starsReceived) * w.stars +
      logNormalize(profile.forksReceived.value, REFERENCE.forksReceived) * w.forks +
      logNormalize(profile.followers.value, REFERENCE.followers) * w.followers +
      logNormalize(profile.starredRepositories.value, REFERENCE.starredRepositories) *
        w.starredRepositories
  );
}

/**
 * Versatility = number of relevant languages (60%) + Shannon-entropy balance (40%).
 * Entropy is normalized by ln(REFERENCE.relevantLanguages) so that "two balanced
 * languages" is not mistaken for "eight balanced languages".
 */
export function calculateVersatility(languages: LanguageAnalysis): number {
  const w = STAT_WEIGHTS.versatility;
  const count = languages.relevant.length;
  const countScore = clamp01(count / REFERENCE.relevantLanguages);
  const balanceScore = normalizedEntropy(
    languages.relevant.map((l) => l.relevantShare),
    REFERENCE.relevantLanguages
  );
  return toStat(countScore * w.languageCount + balanceScore * w.languageBalance);
}

/**
 * Regularity over time, in [0, 1]. Rewards many active months and an even spread
 * (entropy) over isolated bursts; scaled by maturity so a 2-month account is not "perfectly regular".
 */
export function temporalDistribution(months: readonly number[]): number {
  const n = months.length;
  if (n === 0) return 0;

  let total = 0;
  let active = 0;
  for (const m of months) {
    if (m > 0) {
      total += m;
      active++;
    }
  }
  if (total === 0) return 0;

  const activeRatio = active / n;
  const evenness = n === 1 ? 1 : normalizedEntropy(months, n);
  const maturity = clamp01(n / CONSISTENCY_MATURITY_MONTHS);
  const w = CONSISTENCY_DISTRIBUTION_WEIGHTS;
  return (activeRatio * w.activeMonths + evenness * w.evenness) * maturity;
}

export function calculateConsistency(profile: DeveloperProfile): number {
  const w = STAT_WEIGHTS.consistency;
  const a = profile.activity;
  return toStat(
    logNormalize(a.activeDays.value, REFERENCE.activeDays) * w.activeDays +
      temporalDistribution(a.monthlyContributions) * w.distribution +
      logNormalize(a.longestStreakDays.value, REFERENCE.longestStreakDays) * w.longestStreak +
      clamp01(a.recentActiveDays.value / REFERENCE.recentActiveDays) * w.recent
  );
}

export function calculateStats(
  profile: DeveloperProfile,
  languages: LanguageAnalysis,
  age: AccountAge
): RPGStats {
  return {
    activity: calculateActivity(profile),
    experience: calculateExperience(profile, age),
    reputation: calculateReputation(profile),
    versatility: calculateVersatility(languages),
    consistency: calculateConsistency(profile),
  };
}
