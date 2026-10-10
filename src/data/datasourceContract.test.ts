// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createRPGCharacter } from "@/game/engine";
import type { GitHubDataSource } from "./contracts";
import { MockDataSource } from "./datasource/MockDataSource";
import { GitHubApiDataSource } from "./github/GitHubApiDataSource";
import { createFakeGitHub } from "./github/testing/fakeGitHub";
import { loadCharacter } from "./loadCharacter";
import { normalizeDeveloperProfile } from "./normalize";
import { RawGitHubDataSchema, validateRawGitHubData } from "./schemas";

/**
 * Swapping the DataSource must never require touching the Game Engine:
 * both sources feed the SAME validate -> normalize -> createRPGCharacter chain.
 */
function githubSource(): GitHubDataSource {
  const fake = createFakeGitHub({
    login: "contract-dev",
    createdAt: "2020-01-10T00:00:00Z",
    followers: 30,
    repos: [
      { name: "api", stars: 25, forks: 4, languages: { TypeScript: 50_000, Shell: 1_000 } },
      { name: "site", stars: 3, languages: { JavaScript: 20_000 } },
      { name: "forked", fork: true, stars: 500, languages: { Rust: 400_000 } },
    ],
    days: { "2024-03-01": 4, "2024-03-02": 6, "2026-09-30": 2 },
    years: {
      2020: { commits: 10 },
      2024: { commits: 120, pullRequests: 14, issues: 5, reviews: 9 },
      2026: { commits: 30, pullRequests: 3 },
    },
  });
  return new GitHubApiDataSource({ token: "ghp_contract", fetch: fake.fetch, now: () => new Date("2026-10-05T00:00:00Z") });
}

const SOURCES: Array<[string, () => GitHubDataSource, string]> = [
  ["MockDataSource", () => new MockDataSource(), "veteran-dev"],
  ["GitHubApiDataSource", githubSource, "contract-dev"],
];

describe.each(SOURCES)("%s honours the RawGitHubData contract", (_name, make, username) => {
  it("returns data the Zod schema accepts", async () => {
    const raw = await make().getProfile(username);
    expect(RawGitHubDataSchema.safeParse(raw).success).toBe(true);
  });

  it("goes through the unchanged pipeline and yields a complete character", async () => {
    const character = await loadCharacter(username, make());
    expect(Object.keys(character).sort()).toEqual(
      ["achievements", "archetype", "calculationCoverage", "defaultTitleId", "identity", "meta", "nextMilestones", "progression", "resources", "skills", "stats", "summary", "titles"].sort()
    );
    expect(["complete", "partial", "unavailable"]).toContain(character.calculationCoverage.status);
    expect(Object.keys(character.stats).sort()).toEqual(["activity", "consistency", "experience", "reputation", "versatility"]);
    expect(character.progression.level).toBeGreaterThanOrEqual(1);
    expect(character.achievements.length).toBeGreaterThan(0);
  });

  it("ensureProfileExists agrees with getProfile for an existing profile", async () => {
    const source = make();
    await expect(source.ensureProfileExists?.(username) ?? Promise.resolve()).resolves.toBeUndefined();
    await expect(source.getProfile(username)).resolves.toBeTruthy();
  });

  it("is a plain value: validate + normalize + engine are pure functions of it", async () => {
    const raw = validateRawGitHubData(await make().getProfile(username));
    expect(createRPGCharacter(normalizeDeveloperProfile(raw))).toEqual(createRPGCharacter(normalizeDeveloperProfile(raw)));
  });
});

describe("source-specific flags", () => {
  it("only the mock is marked as demo data", async () => {
    expect((await new MockDataSource().getProfile("veteran-dev")).isDemo).toBe(true);
    expect((await githubSource().getProfile("contract-dev")).isDemo).toBe(false);
    expect(new MockDataSource().kind).toBe("mock");
    expect(githubSource().kind).toBe("github");
  });

  it("the GitHub character is not shown as demo", async () => {
    const character = await loadCharacter("contract-dev", githubSource());
    expect(character.meta.isDemo).toBe(false);
  });
});
