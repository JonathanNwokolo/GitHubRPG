/**
 * Typed errors of the GitHub integration. Messages are safe to log: they never carry
 * tokens, request headers or response bodies.
 * ProfileNotFoundError lives in ../contracts (it predates this layer).
 */

export class InvalidUsernameError extends Error {
  constructor() {
    super("Invalid GitHub username.");
    this.name = "InvalidUsernameError";
  }
}

export type RateLimitKind = "primary" | "secondary";

export class GitHubRateLimitError extends Error {
  constructor(
    public readonly limitKind: RateLimitKind,
    /** When the limit lifts, if known. */
    public readonly resetAt: Date | null,
    /** Requests left in the window, if known. */
    public readonly remaining: number | null
  ) {
    super(`GitHub ${limitKind} rate limit reached.`);
    this.name = "GitHubRateLimitError";
  }

  /** Whole seconds to wait from `now`, at least 1, or null when unknown. */
  retryAfterSeconds(now: Date): number | null {
    if (!this.resetAt) return null;
    return Math.max(1, Math.ceil((this.resetAt.getTime() - now.getTime()) / 1000));
  }
}

export type UnavailableReason = "upstream" | "network" | "auth" | "forbidden";

export class GitHubUnavailableError extends Error {
  constructor(
    public readonly reason: UnavailableReason,
    public readonly status: number | null = null
  ) {
    super(`GitHub unavailable (${reason}${status === null ? "" : ` ${status}`}).`);
    this.name = "GitHubUnavailableError";
  }
}

export class GitHubTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`GitHub did not answer within ${timeoutMs} ms.`);
    this.name = "GitHubTimeoutError";
  }
}

/** GitHub answered, but not with the shape we rely on. `what` names the payload, never its content. */
export class GitHubDataValidationError extends Error {
  constructor(public readonly what: string) {
    super(`Unexpected GitHub response: ${what}.`);
    this.name = "GitHubDataValidationError";
  }
}

/** Internal: a 404 / NOT_FOUND. Callers translate it (ProfileNotFoundError, or "skip this repo"). */
export class GitHubNotFoundError extends Error {
  constructor() {
    super("GitHub resource not found.");
    this.name = "GitHubNotFoundError";
  }
}

/** Internal: the profile fetch was cancelled because a sibling request already failed. */
export class RequestAbortedError extends Error {
  constructor() {
    super("Request aborted.");
    this.name = "RequestAbortedError";
  }
}
