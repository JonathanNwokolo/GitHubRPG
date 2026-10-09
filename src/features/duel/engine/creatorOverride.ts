import type { RPGCharacter } from "@/game/types";

/**
 * Stable, centralized GitHub username for the creator of GitHubRPG.
 * Sourced from repository ownership (JonathanNwokolo/GitHubRPG) and Footer attribution.
 */
export const CREATOR_GITHUB_USERNAME = "JonathanNwokolo";

/**
 * Normalizes a GitHub username for stable case-insensitive comparison.
 */
export function normalizeDuelUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Checks whether a given username corresponds to the creator.
 */
export function isCreatorUsername(username: string | undefined | null): boolean {
  if (!username) return false;
  return normalizeDuelUsername(username) === normalizeDuelUsername(CREATOR_GITHUB_USERNAME);
}

export interface CreatorOverrideEvaluation {
  triggered: boolean;
  creatorSide: "A" | "B" | null;
}

/**
 * Evaluates whether Creator Override conditions are met:
 * 1. The creator participates in the duel (as heroA or heroB)
 * 2. The creator lost the duel by any aggregate score
 *
 * Normal creator victories and aggregate draws do not trigger the override.
 */
export function evaluateCreatorOverride(
  characterA: RPGCharacter,
  characterB: RPGCharacter,
  scoreA: number,
  scoreB: number
): CreatorOverrideEvaluation {
  const isA = isCreatorUsername(characterA.identity.username);
  const isB = isCreatorUsername(characterB.identity.username);

  if (isA && scoreA < scoreB) {
    return { triggered: true, creatorSide: "A" };
  }

  if (isB && scoreB < scoreA) {
    return { triggered: true, creatorSide: "B" };
  }

  return { triggered: false, creatorSide: null };
}
