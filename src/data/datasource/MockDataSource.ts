import { ProfileNotFoundError, type GitHubDataSource, type RawGitHubData } from "../contracts";
import { RESERVED_PERSONAS } from "../personas";
import { generateDeterministicProfile } from "../seed/deterministicGenerator";

const MISSING_USERNAMES: ReadonlySet<string> = new Set(["missing-dev"]);

/**
 * Deterministic stand-in for the GitHub API. The same username always returns the
 * same data: reserved personas are fixed, any other name is hashed into a profile.
 */
export class MockDataSource implements GitHubDataSource {
  readonly kind = "mock" as const;

  async getProfile(username: string): Promise<RawGitHubData> {
    const clean = this.cleanOrThrow(username);
    return RESERVED_PERSONAS[clean] ?? generateDeterministicProfile(clean);
  }

  async ensureProfileExists(username: string): Promise<void> {
    this.cleanOrThrow(username);
  }

  private cleanOrThrow(username: string): string {
    const clean = username.toLowerCase().trim();
    if (clean === "" || MISSING_USERNAMES.has(clean)) {
      throw new ProfileNotFoundError(username);
    }
    return clean;
  }
}
