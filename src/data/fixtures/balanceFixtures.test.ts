import { describe, expect, it } from "vitest";
import { LEVEL_MAX, MAX_XP, createRPGCharacter } from "@/game/engine";
import { normalizeDeveloperProfile } from "../normalize";
import { validateRawGitHubData } from "../schemas";
import {
  BalanceFixtureDataSource,
  CONSISTENCY_FIXTURES,
  CONSISTENCY_USERNAMES,
  STRESS_FIXTURES,
  STRESS_USERNAMES,
  spreadTotal,
  topThenSpread,
} from "./balanceFixtures";
import { PERSONA_USERNAMES } from "../personas";

describe("balance fixture helpers", () => {
  it("spreadTotal sums exactly and is as even as integers allow", () => {
    expect(spreadTotal(10, 3)).toEqual([4, 3, 3]);
    expect(spreadTotal(0, 4)).toEqual([0, 0, 0, 0]);
    expect(spreadTotal(5, 0)).toEqual([]);
  });

  it("topThenSpread keeps the explicit head and spreads the rest", () => {
    const values = topThenSpread(100, 5, [50, 20]);
    expect(values.slice(0, 2)).toEqual([50, 20]);
    expect(values.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("stress fixtures", () => {
  it("cover every requested profile", () => {
    expect(Object.keys(STRESS_FIXTURES).sort()).toEqual([...STRESS_USERNAMES].sort());
  });

  it.each(STRESS_USERNAMES)("%s passes validation and is stable across calls", async (username) => {
    const source = new BalanceFixtureDataSource();
    const first = await source.getProfile(username);
    expect(() => validateRawGitHubData(first)).not.toThrow();
    expect(await source.getProfile(username)).toEqual(first);
  });

  it("extreme-dev stays inside every engine bound and ignores its giant forks", async () => {
    const raw = await new BalanceFixtureDataSource().getProfile("extreme-dev");
    const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
    expect(profile.ownRepositories.value).toBe(1_200);
    expect(profile.starsReceived.value).toBe(150_000);

    const character = createRPGCharacter(profile);
    expect(character.progression.level).toBe(99);
    for (const stat of Object.values(character.stats)) expect(stat).toBeLessThanOrEqual(100);
    for (const skill of character.skills) expect(skill.level).toBeLessThanOrEqual(20);
  });

  it.each(STRESS_USERNAMES)("%s has a coherent level progression and is deterministic", async (username) => {
    const raw = await new BalanceFixtureDataSource().getProfile(username);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
    const { progression: p } = createRPGCharacter(profile);

    expect(p.progressPercent).toBeGreaterThanOrEqual(0);
    expect(p.progressPercent).toBeLessThanOrEqual(100);
    expect(p.xpRemaining).toBeGreaterThanOrEqual(0);
    expect(p.totalXp).toBeLessThanOrEqual(MAX_XP);
    if (p.level === LEVEL_MAX) {
      expect(p.nextLevel).toBeNull();
      expect(p.xpRemaining).toBe(0);
      expect(p.nextLevelXp).toBe(p.currentLevelXp);
    } else {
      expect(p.nextLevel).toBe(p.level + 1);
      expect(p.nextLevelXp).toBeGreaterThan(p.totalXp);
    }
    expect(JSON.stringify(createRPGCharacter(profile))).toBe(JSON.stringify(createRPGCharacter(profile)));
  });

  it("single-language-dev and balanced-polyglot-dev differ only in languages", async () => {
    const source = new BalanceFixtureDataSource();
    const [a, b] = await Promise.all([source.getProfile("single-language-dev"), source.getProfile("balanced-polyglot-dev")]);
    const withoutIdentityAndLanguages = (raw: typeof a) => ({
      ...raw,
      username: "",
      displayName: null,
      repositories: raw.repositories.items.map((r) => ({ stars: r.stars, forks: r.forks })),
    });
    expect(withoutIdentityAndLanguages(a)).toEqual(withoutIdentityAndLanguages(b));
  });
});

async function characterOf(username: string) {
  const raw = await new BalanceFixtureDataSource().getProfile(username);
  const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
  return { profile, character: createRPGCharacter(profile) };
}

describe("consistency fixtures", () => {
  it("cover the four requested probes and are not registered as personas", () => {
    expect(Object.keys(CONSISTENCY_FIXTURES).sort()).toEqual([...CONSISTENCY_USERNAMES].sort());
    for (const username of CONSISTENCY_USERNAMES) {
      expect(PERSONA_USERNAMES).not.toContain(username);
      expect(Object.keys(STRESS_FIXTURES)).not.toContain(username);
    }
  });

  it.each(CONSISTENCY_USERNAMES)("%s passes validation, is stable and its months add up to its contributions", async (username) => {
    const source = new BalanceFixtureDataSource();
    const first = await source.getProfile(username);
    expect(() => validateRawGitHubData(first)).not.toThrow();
    expect(await source.getProfile(username)).toEqual(first);

    const { profile } = await characterOf(username);
    const total = profile.commits.value + profile.pullRequests.value + profile.reviews.value + profile.issues.value;
    expect(profile.activity.monthlyContributions.reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("burst-dev and steady-dev have the same volume; only the time distribution differs", async () => {
    const [burst, steady] = await Promise.all([characterOf("burst-dev"), characterOf("steady-dev")]);
    expect(steady.profile.commits.value).toBe(burst.profile.commits.value);
    expect(steady.profile.activity.monthlyContributions).toHaveLength(burst.profile.activity.monthlyContributions.length);
    expect(steady.character.progression.totalXp).toBe(burst.character.progression.totalXp);
  });

  it("steady-dev is more consistent than burst-dev", async () => {
    const [burst, steady] = await Promise.all([characterOf("burst-dev"), characterOf("steady-dev")]);
    expect(steady.character.stats.consistency).toBeGreaterThan(burst.character.stats.consistency);
  });

  it("every consistency stat stays an integer in 0-100", async () => {
    for (const username of CONSISTENCY_USERNAMES) {
      const { character } = await characterOf(username);
      expect(Number.isInteger(character.stats.consistency)).toBe(true);
      expect(character.stats.consistency).toBeGreaterThanOrEqual(0);
      expect(character.stats.consistency).toBeLessThanOrEqual(100);
    }
  });
});
