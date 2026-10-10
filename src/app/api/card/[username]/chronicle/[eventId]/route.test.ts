// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { GitHubUnavailableError } from "@/data/github/errors";
import { loadCharacterWithChronicle } from "@/data/loadCharacter";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { yearlyProfile } from "@/features/chronicle/testing/fixtures";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { m } from "@/test/builders";
import { GET } from "./route";

vi.mock("@/data/loadCharacter", () => ({ loadCharacterWithChronicle: vi.fn() }));
const mockedLoad = vi.mocked(loadCharacterWithChronicle);

const profile = yearlyProfile({
  createdAt: "2019-03-12T00:00:00Z",
  referenceDate: "2026-10-01T00:00:00Z",
  years: {
    2019: 40,
    2020: 180,
    2021: 200,
    2022: 190,
    2023: 342,
    2024: 610,
    2025: { contributions: 1300, commits: 521, pullRequests: 62, reviews: 31, issues: 4, activeDays: 250 },
    2026: 250,
  },
  overrides: { username: "artorias", displayName: "Artorias Silva" },
});
const character = createRPGCharacter(profile);
const chronicle = buildDeveloperChronicle(profile);
const loaded = {
  character,
  chronicle,
  classExplanation: buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage),
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function get(eventId: string, username = "artorias", query = "") {
  return GET(new Request(`http://localhost/api/card/${username}/chronicle/${eventId}${query}`), {
    params: Promise.resolve({ username, eventId }),
  });
}

describe("GET /api/card/[username]/chronicle/[eventId]", () => {
  beforeEach(() => {
    mockedLoad.mockReset();
    mockedLoad.mockResolvedValue(loaded);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("a real chapter is a 1200 x 630 PNG", async () => {
    const response = await get("2025");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 8)]).toEqual(PNG_SIGNATURE);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
  });

  it("the opening and the current chapter have cards too, in either language", async () => {
    for (const year of ["2019", "2026"]) {
      expect((await get(year)).status, year).toBe(200);
      expect((await get(year, "artorias", "?lang=en")).status, year).toBe(200);
    }
  });

  it("is cacheable and sets no cookie", async () => {
    const response = await get("2025");
    expect(response.headers.get("cache-control")).toContain("s-maxage=900");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not publish a Chronicle image for a partial character", async () => {
    const partialProfile = { ...profile, commits: m(0, "unavailable") };
    mockedLoad.mockResolvedValueOnce({
      ...loaded,
      character: createRPGCharacter(partialProfile),
      chronicle: buildDeveloperChronicle(partialProfile),
    });
    const response = await get("2025");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).not.toContain("image/");
  });

  it("a year that is not a chapter of this chronicle is a 404", async () => {
    for (const year of ["1999", "2099", "2018"]) {
      const response = await get(year);
      expect(response.status, year).toBe(404);
      expect(response.headers.get("content-type")).not.toContain("image/");
    }
  });

  it("a chapter the Chronicle does not rate as shareable is a 404", async () => {
    const quiet = chronicle.years.find((entry) => !entry.isStart && !entry.isCurrent && entry.rarity === "normal");
    if (!quiet) return; // this history has no minor chapter: nothing to check
    expect((await get(String(quiet.year))).status).toBe(404);
  });

  it("anything but a four-digit year is a 400 and never reaches the data layer", async () => {
    for (const id of ["abc", "25", "20255", "2025a", "-2025", "%3Cscript%3E", "..%2F2025", "2025.0"]) {
      mockedLoad.mockClear();
      expect((await get(id)).status, id).toBe(400);
      expect(mockedLoad).not.toHaveBeenCalled();
    }
  });

  it("a malformed percent-escape is a 400", async () => {
    expect((await get("%E0%A4%A")).status).toBe(400);
  });

  it("an unknown user is a 404", async () => {
    mockedLoad.mockRejectedValueOnce(new ProfileNotFoundError("ghost"));
    expect((await get("2025", "ghost")).status).toBe(404);
  });

  it("GitHub trouble keeps its status and is never cached", async () => {
    mockedLoad.mockRejectedValueOnce(new GitHubUnavailableError("network"));

    const response = await get("2025");

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
