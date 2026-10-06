// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { GitHubRateLimitError, GitHubUnavailableError, InvalidUsernameError } from "@/data/github/errors";
import { loadCharacter } from "@/data/loadCharacter";
import { createRPGCharacter } from "@/game/createCharacter";
import { makeAverageProfile, makeProfile } from "@/test/builders";
import { GET } from "./route";

vi.mock("@/data/loadCharacter", () => ({ loadCharacter: vi.fn() }));
const mockedLoadCharacter = vi.mocked(loadCharacter);

async function get(username: string) {
  return GET(new Request(`http://localhost/api/badge/${username}`), { params: Promise.resolve({ username }) });
}

describe("GET /api/badge/[username]", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("answers an SVG with the level and class of the real character", async () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    mockedLoadCharacter.mockResolvedValueOnce(character);

    const response = await get("artorias");
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg).toContain(`LV.${character.progression.level}`);
    expect(svg).toContain(character.archetype.className);
    if (character.archetype.subclassName) expect(svg).toContain(character.archetype.subclassName);
    expect(svg).toContain("artorias");
  });

  it("is cacheable by browsers, proxies and the CDN, with stale-while-revalidate", async () => {
    mockedLoadCharacter.mockResolvedValueOnce(createRPGCharacter(makeAverageProfile({ username: "artorias" })));

    const response = await get("artorias");
    const cacheControl = response.headers.get("cache-control") ?? "";

    expect(cacheControl).toContain("public");
    expect(cacheControl).toMatch(/max-age=\d+/);
    expect(cacheControl).toMatch(/s-maxage=3600/);
    expect(cacheControl).toMatch(/stale-while-revalidate=\d+/);
    expect(response.headers.get("cdn-cache-control")).toBe(
      "public, max-age=3600, stale-while-revalidate=86400"
    );
  });

  it("locks the SVG down even if someone opens it directly: nosniff and a no-script CSP, no cookies", async () => {
    mockedLoadCharacter.mockResolvedValueOnce(createRPGCharacter(makeAverageProfile({ username: "artorias" })));

    const { headers } = await get("artorias");

    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(headers.get("set-cookie")).toBeNull();
  });

  it("still shows the level and class for a profile with almost no data", async () => {
    mockedLoadCharacter.mockResolvedValueOnce(createRPGCharacter(makeProfile({ username: "empty-dev" })));

    const response = await get("empty-dev");
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(svg).toContain("LV.1");
    expect(svg).toContain("Aventureiro");
  });

  it("is the same bytes every time for the same character", async () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    mockedLoadCharacter.mockResolvedValue(character);

    expect(await (await get("artorias")).text()).toBe(await (await get("artorias")).text());
  });

  it("asks the data layer exactly once per request (the data source's cache does the rest)", async () => {
    mockedLoadCharacter.mockResolvedValueOnce(createRPGCharacter(makeAverageProfile({ username: "artorias" })));

    await get("artorias");

    expect(mockedLoadCharacter).toHaveBeenCalledTimes(1);
    expect(mockedLoadCharacter.mock.calls[0][0]).toBe("artorias");
  });

  it("a profile that does not exist is a 404 text response, never a made-up badge", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new ProfileNotFoundError("ghost"));

    const response = await get("ghost");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).not.toContain("<svg");
  });

  it("an invalid username is a 404 too", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new InvalidUsernameError());
    expect((await get("not%20valid!")).status).toBe(404);
  });

  it("a malformed percent-escape is a 404, not a crash", async () => {
    expect((await get("%E0%A4%A")).status).toBe(404);
    expect(mockedLoadCharacter).not.toHaveBeenCalled();
  });

  it("GitHub trouble is passed on with its status, a friendly message and no caching", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new GitHubRateLimitError("primary", null, 0));
    const limited = await get("octocat");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("cache-control")).toBe("no-store");
    expect(await limited.text()).toContain("Limite temporário");

    mockedLoadCharacter.mockRejectedValueOnce(new GitHubUnavailableError("network"));
    const unavailable = await get("octocat");
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("cache-control")).toBe("no-store");
  });

  it("an unexpected error never leaks its message", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new Error("token ghp_SECRET leaked in a stack"));

    const response = await get("octocat");

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("ghp_SECRET");
  });
});
