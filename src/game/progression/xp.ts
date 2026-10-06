import { IMPACT_WEIGHTS, PROGRESSION_CURVE_EXPONENT, REFERENCE, XP_WEIGHTS } from "../constants";
import { clamp01, logNormalize } from "../math";
import type { DeveloperProfile } from "../types";
import { MAX_XP } from "./level";

/**
 * Weighted, diminishing-returns score in [0, 1] built from the FULL public history.
 * Followers do not count (they belong to Reputation). Stars and forks only weigh 5%.
 */
export function calculateProgressionScore(profile: DeveloperProfile): number {
  const commitScore = logNormalize(profile.commits.value, REFERENCE.commits);
  const prScore = logNormalize(profile.pullRequests.value, REFERENCE.pullRequests);
  const reviewScore = logNormalize(profile.reviews.value, REFERENCE.reviews);
  const issueScore = logNormalize(profile.issues.value, REFERENCE.issues);
  const repositoryScore = logNormalize(profile.ownRepositories.value, REFERENCE.ownRepositories);
  const impactScore =
    logNormalize(profile.starsReceived.value, REFERENCE.starsReceived) * IMPACT_WEIGHTS.stars +
    logNormalize(profile.forksReceived.value, REFERENCE.forksReceived) * IMPACT_WEIGHTS.forks;

  return clamp01(
    commitScore * XP_WEIGHTS.commits +
      prScore * XP_WEIGHTS.pullRequests +
      reviewScore * XP_WEIGHTS.reviews +
      issueScore * XP_WEIGHTS.issues +
      repositoryScore * XP_WEIGHTS.repositories +
      impactScore * XP_WEIGHTS.impact
  );
}

/** Early-game slowdown curve. */
export function curveProgression(score: number): number {
  return clamp01(score) ** PROGRESSION_CURVE_EXPONENT;
}

/** score 1.0 (every reference reached) maps exactly to the XP of Level 99. */
export function xpFromProgressionScore(score: number): number {
  return Math.round(curveProgression(score) * MAX_XP);
}

export function calculateTotalXp(profile: DeveloperProfile): number {
  return xpFromProgressionScore(calculateProgressionScore(profile));
}
