// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { describeError } from "./errorResponse";
import { CharacterApiError, fetchCharacter } from "./fetchCharacter";

const NOW = new Date("2026-10-05T12:00:00Z");

describe("describeError (HTTP mapping)", () => {
  it.each([
    [new InvalidUsernameError(), 400, "invalid_username"],
    [new ProfileNotFoundError("ghost"), 404, "not_found"],
    [new GitHubRateLimitError("primary", new Date(NOW.getTime() + 90_000), 0), 429, "rate_limited"],
    [new GitHubUnavailableError("upstream", 502), 502, "github_unavailable"],
    [new GitHubUnavailableError("upstream", 500), 502, "github_unavailable"],
    [new GitHubUnavailableError("network"), 503, "github_unavailable"],
    [new GitHubUnavailableError("auth", 401), 503, "github_unavailable"],
    [new GitHubTimeoutError(10_000), 504, "timeout"],
    [new GitHubDataValidationError("user"), 502, "invalid_data"],
    [new ZodError([]), 502, "invalid_data"],
    [new DataSourceConfigError("nope"), 500, "misconfigured"],
    [new Error("kaboom"), 500, "internal"],
    ["a string", 500, "internal"],
  ])("%#: %s -> %i %s", (error, status, code) => {
    const described = describeError(error, NOW);
    expect(described.status).toBe(status);
    expect(described.body.error.code).toBe(code);
  });

  it("rate limit carries a friendly message and Retry-After", () => {
    const described = describeError(new GitHubRateLimitError("primary", new Date(NOW.getTime() + 90_000), 0), NOW);
    expect(described.body.error.message).toBe("Limite temporário da API do GitHub atingido. Tente novamente mais tarde.");
    expect(described.body.error.retryAfterSeconds).toBe(90);
    expect(described.headers["Retry-After"]).toBe("90");
  });

  it("rate limit with an unknown reset time has no Retry-After", () => {
    const described = describeError(new GitHubRateLimitError("secondary", null, null), NOW);
    expect(described.headers["Retry-After"]).toBeUndefined();
    expect(described.body.error.retryAfterSeconds).toBeUndefined();
  });

  it("never leaks internals: no stack, no raw error message for unexpected errors", () => {
    const error = new Error("secret internal detail ghp_abc at C:\\server\\file.ts");
    const described = describeError(error, NOW);
    const dump = JSON.stringify(described);
    expect(dump).not.toContain("ghp_abc");
    expect(dump).not.toContain("file.ts");
    expect(dump).not.toContain("secret internal detail");
  });

  it("keeps the existing 404 wording for missing profiles", () => {
    expect(describeError(new ProfileNotFoundError("ghost"), NOW).body.error.message).toContain("não foi encontrado nos reinos do código (404)");
  });
});

describe("fetchCharacter (browser side)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (response: Response | Error) =>
    vi.stubGlobal("fetch", vi.fn(async () => (response instanceof Error ? Promise.reject(response) : response)));

  it("returns the character on 200 and encodes the username", async () => {
    const mock = vi.fn(async () => new Response(JSON.stringify({ identity: { username: "x" } }), { status: 200 }));
    vi.stubGlobal("fetch", mock);
    await expect(fetchCharacter("a b")).resolves.toEqual({ identity: { username: "x" } });
    expect(mock).toHaveBeenCalledWith("/api/characters/a%20b", { signal: undefined });
  });

  it("turns an API error body into CharacterApiError with the server's safe message", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: { code: "rate_limited", message: "Limite temporário", retryAfterSeconds: 30 } }), { status: 429 })
    );
    const error = await fetchCharacter("x").catch((e) => e);
    expect(error).toBeInstanceOf(CharacterApiError);
    expect(error).toMatchObject({ code: "rate_limited", status: 429, message: "Limite temporário", retryAfterSeconds: 30 });
  });

  it("survives a non-JSON error page", async () => {
    stubFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(fetchCharacter("x")).rejects.toMatchObject({ code: "internal", status: 502 });
  });

  it("reports network failures", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    await expect(fetchCharacter("x")).rejects.toMatchObject({ code: "network" });
  });
});
