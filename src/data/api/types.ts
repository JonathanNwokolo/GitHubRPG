/** Wire format between the browser and /api/characters/[username]. Safe to import from client code. */

export type ApiErrorCode =
  | "invalid_username"
  | "not_found"
  | "rate_limited"
  | "github_unavailable"
  | "timeout"
  | "invalid_data"
  | "misconfigured"
  | "internal"
  /** Client-side only: the request never reached the server. */
  | "network";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    /** Friendly, safe to show as is. Never contains tokens, headers or stack traces. */
    message: string;
    /** Only for rate_limited, when GitHub told us when the limit lifts. */
    retryAfterSeconds?: number;
  };
}
