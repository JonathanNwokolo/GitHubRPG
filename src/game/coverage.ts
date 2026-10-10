import type { DataCoverage, DeveloperProfile, RPGStats } from "./types";

export type CalculationCoverageState = "complete" | "partial" | "unavailable";
export type ProfileMetricId =
  | "commits" | "pullRequests" | "reviews" | "issues" | "followers"
  | "ownRepositories" | "starsReceived" | "forksReceived" | "starredRepositories"
  | "languages" | "activeDays" | "longestStreakDays" | "recentActiveDays" | "monthlyContributions";
export type CalculatedValueId = "xp" | "level" | keyof RPGStats;

export interface CharacterCalculationCoverage {
  status: CalculationCoverageState;
  contributions: DataCoverage;
  unavailableMetrics: ProfileMetricId[];
  affectedValues: CalculatedValueId[];
  xpLevel: CalculationCoverageState;
  attributes: Record<keyof RPGStats, CalculationCoverageState>;
  duel: { comparable: boolean; affectedValues: CalculatedValueId[] };
  hall: { sortable: boolean };
  sharing: { calculatedNumbersPublishable: boolean };
}

type CoveredInput = { id: ProfileMetricId; coverage: DataCoverage };

function state(inputs: readonly CoveredInput[]): CalculationCoverageState {
  if (inputs.every((input) => input.coverage === "full")) return "complete";
  if (inputs.every((input) => input.coverage === "unavailable")) return "unavailable";
  return "partial";
}

function weakest(inputs: readonly CoveredInput[]): DataCoverage {
  if (inputs.every((input) => input.coverage === "full")) return "full";
  if (inputs.every((input) => input.coverage === "unavailable")) return "unavailable";
  return "partial";
}

/**
 * Publication policy for calculated character values. This does not alter an engine formula:
 * it records whether the formula's real inputs were observed completely enough to publish its result.
 */
export function assessCharacterCalculationCoverage(profile: DeveloperProfile): CharacterCalculationCoverage {
  const input = {
    commits: { id: "commits", coverage: profile.commits.coverage },
    pullRequests: { id: "pullRequests", coverage: profile.pullRequests.coverage },
    reviews: { id: "reviews", coverage: profile.reviews.coverage },
    issues: { id: "issues", coverage: profile.issues.coverage },
    followers: { id: "followers", coverage: profile.followers.coverage },
    ownRepositories: { id: "ownRepositories", coverage: profile.ownRepositories.coverage },
    starsReceived: { id: "starsReceived", coverage: profile.starsReceived.coverage },
    forksReceived: { id: "forksReceived", coverage: profile.forksReceived.coverage },
    starredRepositories: { id: "starredRepositories", coverage: profile.starredRepositories.coverage },
    languages: { id: "languages", coverage: profile.languagesCoverage },
    activeDays: { id: "activeDays", coverage: profile.activity.activeDays.coverage },
    longestStreakDays: { id: "longestStreakDays", coverage: profile.activity.longestStreakDays.coverage },
    recentActiveDays: { id: "recentActiveDays", coverage: profile.activity.recentActiveDays.coverage },
    monthlyContributions: { id: "monthlyContributions", coverage: profile.activity.monthlyCoverage },
  } satisfies Record<ProfileMetricId, CoveredInput>;

  const contributionInputs = [input.commits, input.pullRequests, input.reviews, input.issues, input.activeDays, input.longestStreakDays, input.recentActiveDays, input.monthlyContributions];
  const xpInputs = [input.commits, input.pullRequests, input.reviews, input.issues, input.ownRepositories, input.starsReceived, input.forksReceived];
  const attributes: CharacterCalculationCoverage["attributes"] = {
    activity: state([input.commits, input.pullRequests, input.reviews, input.issues, input.activeDays, input.recentActiveDays]),
    experience: state([input.ownRepositories, input.pullRequests, input.reviews, input.issues]),
    reputation: state([input.starsReceived, input.forksReceived, input.followers, input.starredRepositories]),
    versatility: state([input.languages]),
    consistency: state([input.activeDays, input.monthlyContributions, input.longestStreakDays, input.recentActiveDays]),
  };
  const xpLevel = state(xpInputs);
  const affectedValues: CalculatedValueId[] = [
    ...(xpLevel === "complete" ? [] : ["xp", "level"] as const),
    ...(Object.entries(attributes) as [keyof RPGStats, CalculationCoverageState][])
      .filter(([, coverage]) => coverage !== "complete")
      .map(([name]) => name),
  ];
  const allInputs = Object.values(input);
  const unavailableMetrics = allInputs.filter((item) => item.coverage === "unavailable").map((item) => item.id);
  const complete = affectedValues.length === 0;
  const whollyUnavailable = xpLevel === "unavailable" && Object.values(attributes).every((coverage) => coverage === "unavailable");

  return {
    status: complete ? "complete" : whollyUnavailable ? "unavailable" : "partial",
    contributions: weakest(contributionInputs),
    unavailableMetrics,
    affectedValues,
    xpLevel,
    attributes,
    duel: { comparable: complete, affectedValues },
    hall: { sortable: xpLevel === "complete" },
    sharing: { calculatedNumbersPublishable: complete },
  };
}

