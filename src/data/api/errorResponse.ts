import { ZodError } from "zod";
import { ProfileNotFoundError } from "../contracts";
import { DataSourceConfigError } from "../datasource/config";
import {
  GitHubDataValidationError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubUnavailableError,
  InvalidUsernameError,
} from "../github/errors";
import type { ApiErrorBody, ApiErrorCode } from "./types";

export interface ErrorDescription {
  status: number;
  body: ApiErrorBody;
  /** Extra response headers (Retry-After). */
  headers: Record<string, string>;
  /** What to log server-side: names and codes only, never messages that could carry data. */
  logLine: string | null;
}

const MESSAGES: Record<Exclude<ApiErrorCode, "not_found" | "network">, string> = {
  invalid_username: "Nome de usuário inválido. Use apenas letras, números e hífens (máximo de 39 caracteres).",
  rate_limited: "Limite temporário da API do GitHub atingido. Tente novamente mais tarde.",
  github_unavailable: "O GitHub está indisponível no momento. Tente novamente em instantes.",
  timeout: "O GitHub demorou demais para responder. Tente novamente em instantes.",
  invalid_data: "O GitHub retornou dados inesperados. Tente novamente mais tarde.",
  misconfigured: "A fonte de dados do servidor não está configurada corretamente.",
  internal: "Erro interno ao consultar o perfil. Tente novamente.",
};

function describe(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: Partial<ErrorDescription> = {}
): ErrorDescription {
  return { status, body: { error: { code, message } }, headers: {}, logLine: null, ...extra };
}

/** Maps any error of the pipeline to an HTTP status and a safe, friendly body. Pure. */
export function describeError(error: unknown, now: Date): ErrorDescription {
  if (error instanceof InvalidUsernameError) return describe(400, "invalid_username", MESSAGES.invalid_username);
  if (error instanceof ProfileNotFoundError) return describe(404, "not_found", error.message);

  if (error instanceof GitHubRateLimitError) {
    const retryAfter = error.retryAfterSeconds(now);
    return {
      status: 429,
      body: {
        error: {
          code: "rate_limited",
          message: MESSAGES.rate_limited,
          ...(retryAfter === null ? {} : { retryAfterSeconds: retryAfter }),
        },
      },
      headers: retryAfter === null ? {} : { "Retry-After": String(retryAfter) },
      logLine: `GitHub ${error.limitKind} rate limit (remaining=${error.remaining ?? "?"}, resetAt=${error.resetAt?.toISOString() ?? "?"})`,
    };
  }

  if (error instanceof GitHubTimeoutError) {
    return describe(504, "timeout", MESSAGES.timeout, { logLine: `GitHub timeout after ${error.timeoutMs} ms` });
  }

  if (error instanceof GitHubUnavailableError) {
    // Credential problems are our fault, not the visitor's: 503 + a generic message, details only in the log.
    const ourSide = error.reason === "auth" || error.reason === "forbidden" || error.reason === "network";
    return describe(ourSide ? 503 : 502, "github_unavailable", MESSAGES.github_unavailable, {
      logLine: `GitHub unavailable: ${error.reason}${error.status === null ? "" : ` (${error.status})`}`,
    });
  }

  if (error instanceof GitHubDataValidationError) {
    return describe(502, "invalid_data", MESSAGES.invalid_data, { logLine: `GitHub payload rejected: ${error.what}` });
  }
  if (error instanceof ZodError) {
    return describe(502, "invalid_data", MESSAGES.invalid_data, { logLine: "RawGitHubData failed validation" });
  }

  if (error instanceof DataSourceConfigError) {
    return describe(500, "misconfigured", MESSAGES.misconfigured, { logLine: error.message });
  }

  return describe(500, "internal", MESSAGES.internal, {
    logLine: `Unexpected ${error instanceof Error ? error.name : typeof error}`,
  });
}
