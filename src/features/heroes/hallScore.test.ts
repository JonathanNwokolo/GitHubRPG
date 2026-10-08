import { describe, expect, it } from "vitest";
import type { HeroCategoryId } from "./featuredHeroes";
import type { HallScoreHero } from "./hallScore";
import { calculateHallScore, hasWebFocus, orderHallHeroes } from "./hallScore";

function hero(
  username: string,
  overrides: Partial<Omit<HallScoreHero, "username">> = {}
): HallScoreHero {
  return {
    username,
    level: 10,
    starsReceived: 10,
    accountAgeYears: 5,
    languageAffinities: [],
    ...overrides,
  };
}

describe("Hall score", () => {
  it("makes the greatest score the featured hero at position zero", () => {
    const heroes = [hero("steady"), hero("highlight", { level: 20 }), hero("newcomer", { accountAgeYears: 1 })];

    expect(orderHallHeroes(heroes, "legends").map(({ username }) => username)).toEqual([
      "highlight",
      "steady",
      "newcomer",
    ]);
  });

  it("resolves complete ties by level, stars and then username", () => {
    const levelTie = [
      hero("lower-level", { level: 9, accountAgeYears: 7.5 }),
      hero("higher-level", { level: 10, accountAgeYears: 5 }),
    ];
    const starsTie = [
      hero("fewer-stars", { starsReceived: 0, accountAgeYears: 12.5 }),
      hero("more-stars", { starsReceived: 99, accountAgeYears: 0 }),
    ];
    const exactTies = [hero("zeta"), hero("Alpha"), hero("beta")];

    expect(calculateHallScore(levelTie[0], "legends")).toBe(calculateHallScore(levelTie[1], "legends"));
    expect(orderHallHeroes(levelTie, "legends")[0].username).toBe("higher-level");
    expect(calculateHallScore(starsTie[0], "legends")).toBe(calculateHallScore(starsTie[1], "legends"));
    expect(orderHallHeroes(starsTie, "legends")[0].username).toBe("more-stars");
    expect(orderHallHeroes(exactTies, "legends").map(({ username }) => username)).toEqual(["Alpha", "beta", "zeta"]);
  });

  it("returns the same order for the same input without mutating or removing heroes", () => {
    const input = [hero("charlie", { starsReceived: 1 }), hero("alpha", { level: 15 }), hero("bravo")];
    const before = [...input];

    const first = orderHallHeroes(input, "brazil");
    const second = orderHallHeroes(input, "brazil");

    expect(second).toEqual(first);
    expect(input).toEqual(before);
    expect(new Set(first.map(({ username }) => username))).toEqual(new Set(input.map(({ username }) => username)));
  });

  it("keeps every user inside the category where it was supplied", () => {
    const categories: Record<HeroCategoryId, HallScoreHero[]> = {
      legends: [hero("legend-b"), hero("legend-a")],
      brazil: [hero("brazil-b"), hero("brazil-a")],
      web: [hero("web-b"), hero("web-a")],
      guardians: [hero("guardian-b"), hero("guardian-a")],
    };

    for (const [category, members] of Object.entries(categories) as [HeroCategoryId, HallScoreHero[]][]) {
      const ordered = orderHallHeroes(members, category);
      expect(new Set(ordered.map(({ username }) => username))).toEqual(new Set(members.map(({ username }) => username)));
    }
  });

  it("grants the web bonus only from existing, explicitly listed affinity signals", () => {
    const focused = hero("focused", {
      languageAffinities: [{ name: "TypeScript", sharePercent: 35 }, { name: "CSS", sharePercent: 20 }],
    });
    const backend = hero("backend", {
      languageAffinities: [{ name: "Python", sharePercent: 80 }, { name: "Go", sharePercent: 20 }],
    });
    const weakSignal = hero("weak", {
      languageAffinities: [{ name: "JavaScript", sharePercent: 49.9 }],
    });

    expect(hasWebFocus(focused)).toBe(true);
    expect(hasWebFocus(backend)).toBe(false);
    expect(hasWebFocus(weakSignal)).toBe(false);
    expect(calculateHallScore(focused, "web") - calculateHallScore(focused, "legends")).toBe(150);
    expect(calculateHallScore(backend, "web")).toBe(calculateHallScore(backend, "legends"));
  });

  it("only increases the age weight for Guardians", () => {
    const veteran = hero("veteran", { accountAgeYears: 12 });
    expect(calculateHallScore(veteran, "guardians") - calculateHallScore(veteran, "legends")).toBe(120);
  });
});
