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

export interface OfficialDuelScore {
  scoreA: number;
  scoreB: number;
  creatorScore: number;
  opponentScore: number;
  rawScoreA: number;
  rawScoreB: number;
  inverted: boolean;
}

/**
 * Pure projection function that computes the official scoreboard outcome
 * under Creator Override rules:
 * - Raw scores and round history are preserved for debug and internal integrity.
 * - When Creator Override is triggered (creator lost the raw combat),
 *   the official score inverts so the higher score belongs to the Creator
 *   and the lower score belongs to the challenger.
 */
export function computeOfficialDuelScore(
  scoreA: number,
  scoreB: number,
  creatorSide: "A" | "B" | null
): OfficialDuelScore {
  const rawScoreA = scoreA;
  const rawScoreB = scoreB;

  if (!creatorSide) {
    return {
      scoreA,
      scoreB,
      creatorScore: 0,
      opponentScore: 0,
      rawScoreA,
      rawScoreB,
      inverted: false,
    };
  }

  const rawCreator = creatorSide === "A" ? scoreA : scoreB;
  const rawOpponent = creatorSide === "A" ? scoreB : scoreA;

  // If creator lost in raw rounds, invert the official score:
  if (rawCreator < rawOpponent) {
    const higherScore = Math.max(rawCreator, rawOpponent);
    const lowerScore = Math.min(rawCreator, rawOpponent);

    const officialScoreA = creatorSide === "A" ? higherScore : lowerScore;
    const officialScoreB = creatorSide === "B" ? higherScore : lowerScore;

    return {
      scoreA: officialScoreA,
      scoreB: officialScoreB,
      creatorScore: higherScore,
      opponentScore: lowerScore,
      rawScoreA,
      rawScoreB,
      inverted: true,
    };
  }

  return {
    scoreA,
    scoreB,
    creatorScore: rawCreator,
    opponentScore: rawOpponent,
    rawScoreA,
    rawScoreB,
    inverted: false,
  };
}

/**
 * Convenience helper to extract the official displayed scoreboard from a DuelResult.
 */
export function getOfficialDuelScore(duel: {
  scoreA: number;
  scoreB: number;
  officialScoreA?: number;
  officialScoreB?: number;
  creatorOverride: boolean;
  winner: "A" | "B" | "draw";
}): {
  scoreA: number;
  scoreB: number;
  creatorScore: number;
  opponentScore: number;
  creatorSide: "A" | "B" | null;
  inverted: boolean;
} {
  const creatorSide =
    duel.creatorOverride && (duel.winner === "A" || duel.winner === "B")
      ? duel.winner
      : null;

  if (!duel.creatorOverride || !creatorSide) {
    return {
      scoreA: duel.scoreA,
      scoreB: duel.scoreB,
      creatorScore: 0,
      opponentScore: 0,
      creatorSide: null,
      inverted: false,
    };
  }

  const official = computeOfficialDuelScore(duel.scoreA, duel.scoreB, creatorSide);
  return {
    scoreA: duel.officialScoreA ?? official.scoreA,
    scoreB: duel.officialScoreB ?? official.scoreB,
    creatorScore: official.creatorScore,
    opponentScore: official.opponentScore,
    creatorSide,
    inverted: official.inverted,
  };
}
