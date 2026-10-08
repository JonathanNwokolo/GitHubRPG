// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { after } from "next/server";
import { ProfileNotFoundError } from "@/data/contracts";
import { createDataSource } from "@/data/datasource";
import { GitHubRateLimitError, GitHubUnavailableError, ProjectBudgetDeniedError } from "@/data/github/errors";
import { getExperimentalV2DeliveryService } from "@/game-v2/runtimeDelivery";
import { makeRawData } from "@/test/builders";
import { GET } from "./route";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});
vi.mock("@/data/datasource", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/datasource")>();
  return { ...actual, createDataSource: vi.fn() };
});
vi.mock("@/game-v2/runtimeDelivery", () => ({
  createProfileFingerprint: vi.fn(() => "profile-sha"),
  getExperimentalV2DeliveryService: vi.fn(),
}));

const mockedSource = vi.mocked(createDataSource);
const mockedService = vi.mocked(getExperimentalV2DeliveryService);
const lookupByUsername = vi.fn();
const deliver = vi.fn();
const enrich = vi.fn();

describe("GET /api/experimental/v2/characters/[username]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupByUsername.mockResolvedValue(null);
    mockedService.mockReturnValue({ lookupByUsername, deliver, enrich } as never);
  });

  it("returns quickly with an explicit enriching state on a cold miss", async () => {
    mockedSource.mockReturnValue({ kind: "mock", getProfile: vi.fn(async () => makeRawData({ username: "cold-hero" })) });
    deliver.mockResolvedValue({ state: "enriching", character: null, cache: "miss", source: "fallback", durationMs: 3, enrichmentStarted: true });
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/cold-hero"), { params: Promise.resolve({ username: "cold-hero" }) });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ state: "enriching", source: "fallback", enrichmentStarted: true, stale: false });
    expect(response.headers.get("X-GitHubRPG-V2-State")).toBe("enriching");
    expect(lookupByUsername).toHaveBeenCalledWith("cold-hero");
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid username before consulting the source", async () => {
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/bad"), { params: Promise.resolve({ username: "..%2Fsecret" }) });
    expect(response.status).toBe(400);
    expect(mockedSource).not.toHaveBeenCalled();
  });

  it("preserves a real 404 and never fabricates a V2 character", async () => {
    mockedSource.mockReturnValue({ kind: "mock", getProfile: vi.fn(async () => { throw new ProfileNotFoundError("ghost"); }) });
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/ghost"), { params: Promise.resolve({ username: "ghost" }) });
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
    expect(body.character).toBeUndefined();
  });

  it("maps an upstream failure to a friendly 502 without starting V2", async () => {
    mockedSource.mockReturnValue({ kind: "github", getProfile: vi.fn(async () => { throw new GitHubUnavailableError("upstream", 502); }) });
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/upstream-hero"), { params: Promise.resolve({ username: "upstream-hero" }) });
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.error.code).toBe("github_unavailable");
    expect(deliver).not.toHaveBeenCalled();
  });

  it("returns sanitized bounded retry metadata for a GitHub rate limit", async () => {
    mockedSource.mockReturnValue({ kind: "github", getProfile: vi.fn(async () => { throw new GitHubRateLimitError("primary", new Date(Date.now() + 30_000), 0); }) });
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/limited-hero"), { params: Promise.resolve({ username: "limited-hero" }) });
    const body = await response.json();
    expect(response.status).toBe(429);
    expect(body).toMatchObject({ contractVersion: 1, state: "enriching", terminal: false, retryAfterMs: expect.any(Number), error: { code: "rate_limited" } });
    expect(body.retryAfterMs).toBeGreaterThanOrEqual(1_000);
    expect(body.retryAfterMs).toBeLessThanOrEqual(60_000);
    expect(JSON.stringify(body)).not.toMatch(/authorization|cookie|token/i);
  });

  it("uses the same polling-safe 429 contract for a project budget denial", async () => {
    mockedSource.mockReturnValue({ kind: "github", getProfile: vi.fn(async () => { throw new ProjectBudgetDeniedError("github_budget", 45); }) });
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/budget-hero"), { params: Promise.resolve({ username: "budget-hero" }) });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    await expect(response.json()).resolves.toMatchObject({ state: "enriching", terminal: false, retryAfterMs: 45_000, error: { code: "rate_limited" } });
  });

  it.each(["ready", "stale", "partial", "unavailable"] as const)("exposes the %s state without linking public UI", async (state) => {
    mockedSource.mockReturnValue({ kind: "mock", getProfile: vi.fn(async () => makeRawData({ username: "state-hero" })) });
    deliver.mockResolvedValue({ state, character: null, cache: state === "stale" ? "stale" : "hit", source: "l2", durationMs: 2, enrichmentStarted: state === "stale" });
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/state-hero"), { params: Promise.resolve({ username: "state-hero" }) });
    await expect(response.json()).resolves.toMatchObject({ state, source: "l2", stale: state === "stale" });
  });

  it("returns only the client-safe character projection", async () => {
    const character = createRPGCharacterV2(GOLDEN_FIXTURES.architecturalSystem());
    mockedSource.mockReturnValue({ kind: "mock", getProfile: vi.fn(async () => makeRawData({ username: "safe-hero" })) });
    deliver.mockResolvedValue({ state: "ready", character, cache: "hit", source: "l2", durationMs: 1 });
    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/safe-hero"), { params: Promise.resolve({ username: "safe-hero" }) });
    const body = await response.json();
    const serialized = JSON.stringify(body.character);
    expect(body.character.achievements).toHaveLength(54);
    expect(serialized).not.toContain("\"evidence\":");
    expect(serialized).not.toContain("lowerBound");
    expect(serialized).not.toContain("rulesApplied");
    const secret = body.character.achievements.find((item: { secret: boolean; unlocked: boolean }) => item.secret && !item.unlocked);
    expect(secret).toMatchObject({ name: { pt: "???", en: "???" }, progress: null, target: null });
  });

  it.each([
    ["ready", "l1"],
    ["partial", "l2"],
  ] as const)("serves a final %s %s hit before loading the GitHub base", async (state, source) => {
    const character = createRPGCharacterV2(GOLDEN_FIXTURES.architecturalSystem());
    const cachedCharacter = { ...character, identity: { ...character.identity, username: "fast-hero" } };
    const getProfile = vi.fn(async () => makeRawData({ username: "fast-hero" }));
    mockedSource.mockReturnValue({ kind: "github", getProfile });
    lookupByUsername.mockResolvedValue({ state, character: cachedCharacter, cache: "hit", source, durationMs: 1 });

    const response = await GET(new Request("http://localhost/api/experimental/v2/characters/fast-hero"), { params: Promise.resolve({ username: "fast-hero" }) });
    await expect(response.json()).resolves.toMatchObject({ state, source, character: expect.any(Object) });
    expect(response.status).toBe(200);
    expect(getProfile).not.toHaveBeenCalled();
    expect(mockedSource).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
    expect(enrich).not.toHaveBeenCalled();
  });

  it("serves permitted stale data immediately and defers revalidation", async () => {
    const character = createRPGCharacterV2(GOLDEN_FIXTURES.architecturalSystem());
    const getProfile = vi.fn(async () => makeRawData({ username: character.identity.username }));
    mockedSource.mockReturnValue({ kind: "github", getProfile });
    lookupByUsername.mockResolvedValue({ state: "stale", character, cache: "stale", source: "l2", durationMs: 1 });

    const response = await GET(new Request(`http://localhost/api/experimental/v2/characters/${character.identity.username}`), { params: Promise.resolve({ username: character.identity.username }) });
    await expect(response.json()).resolves.toMatchObject({ state: "stale", stale: true, terminal: false });
    expect(getProfile).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
    const revalidate = vi.mocked(after).mock.calls[0]?.[0];
    expect(revalidate).toBeTypeOf("function");
    if (typeof revalidate === "function") await revalidate();
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(enrich).toHaveBeenCalledTimes(1);
  });
});
