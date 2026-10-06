import type { DataCoverage } from "@/game/types";

export type { DataCoverage };

/** A raw counter as the source could observe it. */
export interface RawMetric {
  /** null is only valid when coverage is "unavailable". */
  value: number | null;
  coverage: DataCoverage;
}

export interface RawRepository {
  name: string;
  isFork: boolean;
  stars: number;
  forks: number;
  /** Language name -> bytes. */
  languages: Record<string, number>;
}

/**
 * What a GitHubDataSource returns. Deliberately close to what the real GitHub
 * REST/GraphQL APIs can provide, so GitHubApiDataSource is a mapping exercise only.
 */
export interface RawGitHubData {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  location?: string | null;
  company?: string | null;
  /** ISO date of account creation. */
  createdAt: string;
  /** ISO date the data was observed. The engine treats it as "now". */
  fetchedAt: string;
  isDemo: boolean;

  followers: RawMetric;
  /** Lifetime totals since account creation. */
  commits: RawMetric;
  pullRequests: RawMetric;
  reviews: RawMetric;
  issues: RawMetric;

  /** ALL public repositories (forks included, flagged). */
  repositories: { items: RawRepository[]; coverage: DataCoverage };

  activity: {
    /** Days with at least one contribution, whole history. */
    activeDays: RawMetric;
    longestStreakDays: RawMetric;
    currentStreakDays: RawMetric;
    /** Active days inside the last RECENT_WINDOW_DAYS (365) days. */
    recentActiveDays: RawMetric;
    /** Contributions per month, chronological, creation month .. fetchedAt month (inclusive). */
    monthlyContributions: { months: number[]; coverage: DataCoverage };
  };
}

export interface GitHubDataSource {
  /** "mock" keeps the "Dados de demonstração" notice visible in the UI. */
  readonly kind: "mock" | "github";
  /** @throws ProfileNotFoundError when the user does not exist. */
  getProfile(username: string): Promise<RawGitHubData>;
}

export class ProfileNotFoundError extends Error {
  constructor(public readonly username: string) {
    super(`Aventureiro "${username}" não foi encontrado nos reinos do código (404).`);
    this.name = "ProfileNotFoundError";
  }
}
