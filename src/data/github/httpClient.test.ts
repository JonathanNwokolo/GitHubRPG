// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  GitHubDataValidationError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubUnavailableError,
} from "./errors";
import { GitHubHttpClient, buildHeaders, type RequestContext } from "./httpClient";
import { RequestStats } from "./stats";

const NOW = new Date("2026-10-05T12:00:00Z");
const SECRET = "ghp_SUPER_SECRET_TOKEN_123";

function ctx(): RequestContext {
  return { stats: new RequestStats() };
}

function reply(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
}

function clientWith(responses: Array<Response | Error | (() => Promise<Response>)>, options: { token?: string } = {}) {
  const queue = [...responses];
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra request");
    if (next instanceof Error) throw next;
    return typeof next === "function" ? next() : next;
  });
  const sleep = vi.fn(async () => {});
  const client = new GitHubHttpClient({ ...options, fetch: fetchMock as unknown as typeof fetch, now: () => NOW, sleep, timeoutMs: 50 });
  return { client, fetchMock, sleep };
}

describe("headers", () => {
  it("sends the recommended GitHub headers", () => {
    const headers = buildHeaders(undefined, false);
    expect(headers.Accept).toBe("application/vnd.github+json");
    expect(headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
    expect(headers["User-Agent"]).toBeTruthy();
    expect(headers.Authorization).toBeUndefined();
  });

  it("adds Authorization only when a token exists", async () => {
    const authed = clientWith([reply(200, {})], { token: SECRET });
    await authed.client.rest("/users/x", undefined, ctx());
    expect((authed.fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);

    const anonymous = clientWith([reply(200, {})]);
    await anonymous.client.rest("/users/x", undefined, ctx());
    expect((anonymous.fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("refuses GraphQL without a token", async () => {
    const { client } = clientWith([]);
    await expect(client.graphql("query { x }", {}, ctx())).rejects.toMatchObject({ reason: "auth" });
  });
});

describe("failures", () => {
  it("maps 404 to GitHubNotFoundError", async () => {
    const { client } = clientWith([reply(404, { message: "Not Found" })]);
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toBeInstanceOf(GitHubNotFoundError);
  });

  it("maps 401 to an auth error", async () => {
    const { client } = clientWith([reply(401, { message: "Bad credentials" })], { token: SECRET });
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toMatchObject({ name: "GitHubUnavailableError", reason: "auth" });
  });

  it("detects a primary rate limit from 403 + x-ratelimit-remaining: 0", async () => {
    const reset = Math.floor(NOW.getTime() / 1000) + 600;
    const { client } = clientWith([
      reply(403, { message: "API rate limit exceeded" }, { "x-ratelimit-remaining": "0", "x-ratelimit-limit": "60", "x-ratelimit-reset": String(reset) }),
    ]);
    const error = await client.rest("/users/x", undefined, ctx()).catch((e) => e);
    expect(error).toBeInstanceOf(GitHubRateLimitError);
    expect(error.limitKind).toBe("primary");
    expect(error.remaining).toBe(0);
    expect(error.resetAt).toEqual(new Date(reset * 1000));
    expect(error.retryAfterSeconds(NOW)).toBe(600);
  });

  it("detects a primary rate limit from 429", async () => {
    const reset = Math.floor(NOW.getTime() / 1000) + 30;
    const { client } = clientWith([reply(429, {}, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) })]);
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toMatchObject({ limitKind: "primary" });
  });

  it("detects a secondary rate limit from Retry-After", async () => {
    const { client } = clientWith([reply(403, { message: "slow down" }, { "retry-after": "45", "x-ratelimit-remaining": "4000" })]);
    const error = await client.rest("/users/x", undefined, ctx()).catch((e) => e);
    expect(error).toBeInstanceOf(GitHubRateLimitError);
    expect(error.limitKind).toBe("secondary");
    expect(error.retryAfterSeconds(NOW)).toBe(45);
  });

  it("detects a secondary rate limit from the message", async () => {
    const { client } = clientWith([reply(403, { message: "You have exceeded a secondary rate limit." })]);
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toMatchObject({ limitKind: "secondary" });
  });

  it("treats other 403s as forbidden, not as a rate limit", async () => {
    const { client } = clientWith([reply(403, { message: "Resource not accessible" }, { "x-ratelimit-remaining": "100" })]);
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toMatchObject({ name: "GitHubUnavailableError", reason: "forbidden" });
  });

  it("does not retry a rate limit, and fails fast afterwards without touching the network", async () => {
    const { client, fetchMock, sleep } = clientWith([reply(429, {}, { "retry-after": "60" })]);
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toBeInstanceOf(GitHubRateLimitError);
    await expect(client.rest("/users/y", undefined, ctx())).rejects.toBeInstanceOf(GitHubRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("stops sending requests once a successful response reports remaining 0", async () => {
    const reset = Math.floor(NOW.getTime() / 1000) + 300;
    const { client, fetchMock } = clientWith([reply(200, {}, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) })]);
    await client.rest("/users/x", undefined, ctx());
    await expect(client.rest("/users/y", undefined, ctx())).rejects.toBeInstanceOf(GitHubRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lets REST and GraphQL budgets fail independently", async () => {
    const { client } = clientWith(
      [reply(429, {}, { "retry-after": "60" }), reply(200, { data: { ok: true } })],
      { token: SECRET }
    );
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toBeInstanceOf(GitHubRateLimitError);
    await expect(client.graphql("query { ok }", {}, ctx())).resolves.toEqual({ ok: true });
  });

  it("treats a GraphQL RATE_LIMITED error as a rate limit", async () => {
    const { client } = clientWith([reply(200, { errors: [{ type: "RATE_LIMITED", message: "API rate limit exceeded" }] })], { token: SECRET });
    await expect(client.graphql("query { x }", {}, ctx())).rejects.toBeInstanceOf(GitHubRateLimitError);
  });

  it("maps GraphQL NOT_FOUND and other GraphQL errors", async () => {
    const notFound = clientWith([reply(200, { data: { user: null }, errors: [{ type: "NOT_FOUND" }] })], { token: SECRET });
    await expect(notFound.client.graphql("q", {}, ctx())).rejects.toBeInstanceOf(GitHubNotFoundError);

    const other = clientWith([reply(200, { errors: [{ type: "MAX_NODE_LIMIT_EXCEEDED" }] })], { token: SECRET });
    await expect(other.client.graphql("q", {}, ctx())).rejects.toBeInstanceOf(GitHubUnavailableError);
  });

  it("rejects a malformed GraphQL envelope and a non-JSON body", async () => {
    const envelope = clientWith([reply(200, { errors: "nope" })], { token: SECRET });
    await expect(envelope.client.graphql("q", {}, ctx())).rejects.toBeInstanceOf(GitHubDataValidationError);

    const html = clientWith([reply(200, "<html>oops</html>")]);
    await expect(html.client.rest("/users/x", undefined, ctx())).rejects.toBeInstanceOf(GitHubDataValidationError);
  });
});

describe("timeout, retry and cancellation", () => {
  it("times out with a typed error and does not retry", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    );
    const client = new GitHubHttpClient({ fetch: fetchMock as unknown as typeof fetch, timeoutMs: 20, sleep: async () => {} });
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toBeInstanceOf(GitHubTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on 503 and then succeeds", async () => {
    const { client, fetchMock, sleep } = clientWith([reply(503, {}), reply(200, { ok: true })]);
    const result = await client.rest("/users/x", undefined, ctx());
    expect(result.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("gives up after one retry and reports an upstream error", async () => {
    const { client, fetchMock } = clientWith([reply(502, {}), reply(502, {})]);
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toMatchObject({ reason: "upstream", status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network error once", async () => {
    const { client, fetchMock } = clientWith([new TypeError("fetch failed"), reply(200, { ok: 1 })]);
    await expect(client.rest("/users/x", undefined, ctx())).resolves.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 500 or a 422", async () => {
    const { client, fetchMock } = clientWith([reply(500, {}), reply(200, {})]);
    await expect(client.rest("/users/x", undefined, ctx())).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("counts every attempt in the stats", async () => {
    const { client } = clientWith([reply(503, {}), reply(200, {})]);
    const context = ctx();
    await client.rest("/users/x", undefined, context);
    expect(context.stats.rest).toBe(2);
    expect(context.stats.graphql).toBe(0);
  });

  it("does not start a request when the profile fetch was already aborted", async () => {
    const { client, fetchMock } = clientWith([reply(200, {})]);
    const controller = new AbortController();
    controller.abort();
    await expect(client.rest("/users/x", undefined, { stats: new RequestStats(), signal: controller.signal })).rejects.toMatchObject({
      name: "RequestAbortedError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("secrecy", () => {
  it("never puts the token in an error", async () => {
    const cases: Array<Response | Error> = [
      reply(401, { message: `Bad credentials ${SECRET}` }),
      reply(403, { message: "forbidden" }),
      reply(500, {}),
      reply(429, {}, { "retry-after": "1" }),
      new TypeError(`fetch failed for ${SECRET}`),
    ];
    for (const response of cases) {
      const { client } = clientWith([response, response], { token: SECRET });
      const error = await client.rest("/users/x", undefined, ctx()).catch((e) => e);
      const dump = JSON.stringify({ name: error.name, message: error.message, own: Object.entries(error) });
      expect(dump).not.toContain(SECRET);
    }
  });
});
