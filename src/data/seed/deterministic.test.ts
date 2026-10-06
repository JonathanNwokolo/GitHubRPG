import { describe, expect, it } from "vitest";
import { createDataSource } from "../datasource";
import { MockDataSource } from "../datasource/MockDataSource";
import { ProfileNotFoundError } from "../contracts";
import { loadCharacter } from "../loadCharacter";
import { RESERVED_PERSONAS } from "../personas";
import { validateRawGitHubData } from "../schemas";
import { allocateByWeight, generateDeterministicProfile } from "./deterministicGenerator";
import { createMulberry32, fnv1a } from "./hashAndPrng";

describe("seed primitives", () => {
  it("fnv1a is stable for the same string and differs between strings", () => {
    expect(fnv1a("john-doe")).toBe(fnv1a("john-doe"));
    expect(fnv1a("john-doe")).not.toBe(fnv1a("jane-doe"));
  });

  it("createMulberry32 yields the same sequence for the same seed, values in [0, 1)", () => {
    const a = createMulberry32(123456);
    const b = createMulberry32(123456);
    for (let i = 0; i < 20; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("allocateByWeight sums exactly to n", () => {
    for (const n of [0, 1, 7, 31, 58]) {
      expect(allocateByWeight(n, [30, 25, 18, 10, 8, 6, 3]).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe("MockDataSource", () => {
  const source = new MockDataSource();

  it("identifies itself as a mock", () => {
    expect(source.kind).toBe("mock");
  });

  it("returns exactly the same data for the same username (case/space insensitive)", async () => {
    const a = await source.getProfile("mystic-coder");
    const b = await source.getProfile("  Mystic-Coder ");
    expect(a).toEqual(b);
  });

  it("returns different data for different usernames", async () => {
    const a = await source.getProfile("alpha-user");
    const b = await source.getProfile("omega-user");
    expect(a).not.toEqual(b);
  });

  it("returns the fixed persona for reserved usernames", async () => {
    expect(await source.getProfile("veteran-dev")).toBe(RESERVED_PERSONAS["veteran-dev"]);
    expect((await source.getProfile("popular-dev")).followers.value).toBe(3_200);
  });

  it("answers missing-dev and blank names with a 404-style error", async () => {
    await expect(source.getProfile("missing-dev")).rejects.toBeInstanceOf(ProfileNotFoundError);
    await expect(source.getProfile("missing-dev")).rejects.toThrow(/não foi encontrado/);
    await expect(source.getProfile("   ")).rejects.toBeInstanceOf(ProfileNotFoundError);
  });

  it("is generated from the seed, not from the clock", () => {
    const a = generateDeterministicProfile("seeded");
    const b = generateDeterministicProfile("seeded");
    expect(a).toEqual(b);
    expect(a.fetchedAt).toBe("2026-10-01T00:00:00Z");
  });

  it("every persona and many hashed users pass the schema", () => {
    for (const persona of Object.values(RESERVED_PERSONAS)) {
      expect(() => validateRawGitHubData(persona)).not.toThrow();
    }
    for (let i = 0; i < 60; i++) {
      expect(() => validateRawGitHubData(generateDeterministicProfile(`user-${i}`))).not.toThrow();
    }
  });

  it("includes forks with big numbers on purpose, to prove they do not count", () => {
    const veteran = RESERVED_PERSONAS["veteran-dev"];
    expect(veteran.repositories.items.some((r) => r.isFork && r.stars > 0)).toBe(true);
  });
});

describe("createDataSource + pipeline", () => {
  it("returns the mock for now, always the same instance", () => {
    expect(createDataSource().kind).toBe("mock");
    expect(createDataSource()).toBe(createDataSource());
  });

  it("same username -> same character, class and achievements", async () => {
    const a = await loadCharacter("deterministic-hero");
    const b = await loadCharacter("deterministic-hero");
    expect(a).toEqual(b);
    expect(a.archetype).toEqual(b.archetype);
    expect(a.achievements).toEqual(b.achievements);
  });

  it("any username yields a valid character", async () => {
    for (let i = 0; i < 80; i++) {
      const c = await loadCharacter(`property-${i}`);
      expect(c.progression.level).toBeGreaterThanOrEqual(1);
      expect(c.progression.level).toBeLessThanOrEqual(99);
      for (const value of Object.values(c.stats)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      for (const skill of c.skills) {
        expect(skill.level).toBeGreaterThanOrEqual(1);
        expect(skill.level).toBeLessThanOrEqual(20);
      }
      expect(c.resources.hp).toBe(c.resources.maxHp);
    }
  });

  it("propagates the 404", async () => {
    await expect(loadCharacter("missing-dev")).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});
