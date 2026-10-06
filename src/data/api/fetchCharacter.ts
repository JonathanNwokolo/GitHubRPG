import type { RPGCharacter } from "@/game/types";
import type { ApiErrorBody, ApiErrorCode } from "./types";

/** Client-side error for a failed /api/characters call. `message` is safe to show. */
export class CharacterApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "CharacterApiError";
  }
}

const NETWORK_MESSAGE = "Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.";
const GENERIC_MESSAGE = "Erro ao consultar os anais mágicos do perfil.";

function readErrorBody(value: unknown): ApiErrorBody["error"] | null {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = (value as { error: unknown }).error;
  if (typeof error !== "object" || error === null) return null;
  const { code, message, retryAfterSeconds } = error as Record<string, unknown>;
  if (typeof code !== "string" || typeof message !== "string") return null;
  return {
    code: code as ApiErrorCode,
    message,
    retryAfterSeconds: typeof retryAfterSeconds === "number" ? retryAfterSeconds : undefined,
  };
}

/**
 * The browser's only door to character data. The server runs the whole pipeline
 * (DataSource -> Zod -> normalize -> Game Engine), so no credential ever reaches the client.
 */
export async function fetchCharacter(username: string, signal?: AbortSignal): Promise<RPGCharacter> {
  let response: Response;
  try {
    response = await fetch(`/api/characters/${encodeURIComponent(username)}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new CharacterApiError("network", NETWORK_MESSAGE, 0);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const parsed = readErrorBody(body);
    if (parsed) throw new CharacterApiError(parsed.code, parsed.message, response.status, parsed.retryAfterSeconds);
    throw new CharacterApiError("internal", GENERIC_MESSAGE, response.status);
  }
  if (typeof body !== "object" || body === null) {
    throw new CharacterApiError("internal", GENERIC_MESSAGE, response.status);
  }
  return body as RPGCharacter;
}
