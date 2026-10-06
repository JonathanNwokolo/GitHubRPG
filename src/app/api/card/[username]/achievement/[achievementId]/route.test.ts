// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { GitHubRateLimitError, InvalidUsernameError } from "@/data/github/errors";
import { loadCharacter } from "@/data/loadCharacter";
import { createRPGCharacter } from "@/game/createCharacter";
import { makeAverageProfile } from "@/test/builders";
import { GET } from "./route";

vi.mock("@/data/loadCharacter", () => ({ loadCharacter: vi.fn() }));
const mockedLoadCharacter = vi.mocked(loadCharacter);

const character = createRPGCharacter(makeAverageProfile({ username: "artorias", displayName: "Artorias Silva" }));
const unlockedId = character.achievements.find((a) => a.unlocked)!.id;
const lockedId = character.achievements.find((a) => !a.unlocked)!.id;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function get(achievementId: string, username = "artorias", query = "") {
  return GET(new Request(`http://localhost/api/card/${username}/achievement/${achievementId}${query}`), {
    params: Promise.resolve({ username, achievementId }),
  });
}

describe("GET /api/card/[username]/achievement/[achievementId]", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
    mockedLoadCharacter.mockResolvedValue(character);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("an unlocked achievement is a 1200 x 630 PNG", async () => {
    const response = await get(unlockedId);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    // IHDR: width and height, big endian, right after the signature and the chunk header.
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
  });

  it("is cacheable and sets no cookie", async () => {
    const response = await get(unlockedId);

    expect(response.headers.get("cache-control")).toContain("s-maxage=900");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("renders in English with ?lang=en", async () => {
    const response = await get(unlockedId, "artorias", "?lang=en");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("ignores any other ?lang value instead of passing it anywhere", async () => {
    const response = await get(unlockedId, "artorias", "?lang=<script>alert(1)</script>");
    expect(response.status).toBe(200);
  });

  it("a LOCKED achievement is a 404: a URL cannot fabricate a card", async () => {
    const response = await get(lockedId);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).not.toContain("image/");
  });

  it("an id that is not in the catalog is a 404", async () => {
    for (const id of ["foo", "age-4", "commits-0"]) {
      expect((await get(id)).status, id).toBe(404);
    }
  });

  it("a malformed id is a 400 and never reaches the data layer", async () => {
    for (const id of ["AGE-5", "age_5", "age%205", "..%2Fage-5", "a".repeat(80), "%3Cscript%3E"]) {
      mockedLoadCharacter.mockClear();
      expect((await get(id)).status, id).toBe(400);
      expect(mockedLoadCharacter).not.toHaveBeenCalled();
    }
  });

  it("a malformed percent-escape is a 400", async () => {
    expect((await get("%E0%A4%A")).status).toBe(400);
  });

  it("an unknown user is a 404", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new ProfileNotFoundError("ghost"));
    expect((await get(unlockedId, "ghost")).status).toBe(404);

    mockedLoadCharacter.mockRejectedValueOnce(new InvalidUsernameError());
    expect((await get(unlockedId, "not-valid")).status).toBe(404);
  });

  it("a blank username is a 400", async () => {
    expect((await get(unlockedId, "%20")).status).toBe(400);
  });

  it("GitHub trouble keeps its status and is never cached", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new GitHubRateLimitError("primary", null, 0));

    const response = await get(unlockedId);

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("checks the id against the achievements of the REAL character each time", async () => {
    // Same id, two different users: only the one that unlocked it gets a card.
    const rookie = createRPGCharacter(makeAverageProfile({ username: "rookie", accountCreatedAt: "2025-12-20T00:00:00Z" }));
    expect(rookie.achievements.find((a) => a.id === "age-3")?.unlocked).toBe(false);
    mockedLoadCharacter.mockResolvedValueOnce(rookie);
    expect((await get("age-3", "rookie")).status).toBe(404);

    mockedLoadCharacter.mockResolvedValueOnce(character);
    expect((await get("age-3")).status).toBe(200);
  });
});
