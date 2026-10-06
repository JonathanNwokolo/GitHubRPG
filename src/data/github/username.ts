import { InvalidUsernameError } from "./errors";

/**
 * GitHub usernames: alphanumeric or single hyphens, no leading/trailing hyphen, 1-39 chars.
 * Anything else is rejected before a URL is ever built.
 */
const GITHUB_USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Trims and validates. Returns the username as typed (case kept). @throws InvalidUsernameError */
export function parseGitHubUsername(input: unknown): string {
  if (typeof input !== "string") throw new InvalidUsernameError();
  const trimmed = input.trim();
  if (!GITHUB_USERNAME.test(trimmed)) throw new InvalidUsernameError();
  return trimmed;
}

/** GitHub logins are case-insensitive: this is the key for caches and in-flight dedup. */
export function usernameKey(login: string): string {
  return login.toLowerCase();
}
