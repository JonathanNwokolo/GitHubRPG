import { describe, expect, it } from "vitest";
import { loadCharacter } from "@/data/loadCharacter";
import { createRPGCharacter } from "./createCharacter";
import type { ThresholdTitleProgress } from "./types";
import { calculateResources } from "./resources";
import { m, makeAverageProfile, makeMaxedProfile, makeProfile } from "@/test/builders";

describe("createRPGCharacter", () => {
  it("is deterministic: same profile, same character", () => {
    const profile = makeAverageProfile();
    expect(createRPGCharacter(profile)).toEqual(createRPGCharacter(structuredClone(profile)));
  });

  it("does not mutate its input", () => {
    const profile = makeAverageProfile();
    const snapshot = structuredClone(profile);
    createRPGCharacter(profile);
    expect(profile).toEqual(snapshot);
  });

  it("an empty profile is a dignified Level 1 Aventureiro with goals to chase", () => {
    const c = createRPGCharacter(makeProfile({ username: "nobody", accountCreatedAt: "2025-12-25T00:00:00Z" }));
    expect(c.progression).toMatchObject({ level: 1, tier: "Iniciante", totalXp: 0, progressPercent: 0 });
    expect(c.archetype.className).toBe("Aventureiro");
    expect(c.archetype.subclassName).toBeUndefined();
    expect(c.skills).toEqual([]);
    expect(c.achievements.every((a) => !a.unlocked)).toBe(true);
    expect(Object.values(c.stats).every((v) => v === 0)).toBe(true);
    expect(c.nextMilestones[0]).toMatchObject({ name: "Primeiro Repositório", current: 0, target: 1 });
    expect(c.defaultTitleId).toBeNull();
    expect(c.titles.length).toBeGreaterThan(0);
  });

  it("a maxed profile reaches Level 99, Ascendente", () => {
    const c = createRPGCharacter(makeMaxedProfile());
    expect(c.progression).toMatchObject({ level: 99, tier: "Ascendente", xpRemaining: 0, progressPercent: 100 });
    expect(Object.values(c.stats).filter((v) => v === 100).length).toBeGreaterThanOrEqual(3);
  });

  it("HP and MP are always full and never influence XP or level", () => {
    const c = createRPGCharacter(makeAverageProfile());
    expect(c.resources.hp).toBe(c.resources.maxHp);
    expect(c.resources.mp).toBe(c.resources.maxMp);
    expect(c.resources).toEqual(calculateResources(c.progression.level, c.stats));
    expect(c.progression.level).toBe(createRPGCharacter(makeAverageProfile()).progression.level);
  });

  it("HP follows Level + Experience + Consistency; MP follows Level + Versatility + Activity", () => {
    const stats = { activity: 10, experience: 20, reputation: 99, versatility: 30, consistency: 40 };
    expect(calculateResources(5, stats)).toEqual({ hp: 100 + 20 + 40 + 80, maxHp: 240, mp: 50 + 15 + 60 + 20, maxMp: 145 });
    expect(calculateResources(5, { ...stats, reputation: 0 })).toEqual(calculateResources(5, stats));
  });

  it("exposes the summary with coverage so the UI can say 'at least'", () => {
    const c = createRPGCharacter(makeProfile({ commits: m(1_240, "partial") }));
    expect(c.summary.commits).toEqual({ value: 1_240, coverage: "partial" });
  });

  it("carries the demo flag", () => {
    expect(createRPGCharacter(makeProfile({ isDemo: true })).meta.isDemo).toBe(true);
    expect(createRPGCharacter(makeProfile({ isDemo: false })).meta.isDemo).toBe(false);
  });

  it("is monotonic: more activity never lowers XP or level", () => {
    const low = createRPGCharacter(makeAverageProfile({ commits: m(100) }));
    const high = createRPGCharacter(makeAverageProfile({ commits: m(2_000) }));
    expect(high.progression.totalXp).toBeGreaterThan(low.progression.totalXp);
    expect(high.progression.level).toBeGreaterThanOrEqual(low.progression.level);
  });
});

describe("test personas end to end", () => {
  it("rookie-dev: Mago / Bardo, early game, low stats", async () => {
    const c = await loadCharacter("rookie-dev");
    expect(c.archetype).toMatchObject({ className: "Mago", subclassName: "Bardo" });
    expect(c.progression.level).toBeLessThan(20);
    expect(c.achievements.filter((a) => a.unlocked).length).toBeLessThan(8);
    expect(c.titles.find((t) => t.unlocked)?.name).toBe("Tecelão de Interfaces");
  });

  it("veteran-dev: 11-year account holds the cumulative age achievements but not the 15-year one", async () => {
    const c = await loadCharacter("veteran-dev");
    const unlocked = (id: string) => c.achievements.find((a) => a.id === id)?.unlocked;
    expect(["age-1", "age-3", "age-5", "age-10"].every(unlocked)).toBe(true);
    expect(unlocked("age-15")).toBe(false);
    expect(c.archetype.className).toBe("Guerreiro");
    expect(c.progression.level).toBeGreaterThan(50);
  });

  it("veteran-dev: partial commits unlock what they already prove and hide what is missing", async () => {
    const c = await loadCharacter("veteran-dev");
    const storm = c.achievements.find((a) => a.id === "commits-5000");
    const eternal = c.achievements.find((a) => a.id === "commits-10000");
    expect(storm).toMatchObject({ unlocked: true, coverage: "partial" });
    expect(eternal).toMatchObject({ unlocked: false, coverage: "partial", remaining: null, progressPercent: null });
    expect(eternal?.current).toBe(6_840);
  });

  it("polyglot-dev: several relevant languages, Mago / Alquimista", async () => {
    const c = await loadCharacter("polyglot-dev");
    expect(c.archetype).toMatchObject({ className: "Mago", subclassName: "Alquimista" });
    expect(c.skills.length).toBeGreaterThanOrEqual(5);
    expect(c.achievements.find((a) => a.id === "languages-5")?.unlocked).toBe(true);
  });

  it("popular-dev: 437 stars, 4.2 years, reputation above the others", async () => {
    const c = await loadCharacter("popular-dev");
    const beacon = c.achievements.find((a) => a.id === "stars-1000");
    expect(beacon).toMatchObject({ current: 437, target: 1_000, remaining: 563, unlocked: false });
    expect(c.achievements.find((a) => a.id === "age-5")).toMatchObject({ unlocked: false, current: 4.2 });
    const rookie = await loadCharacter("rookie-dev");
    expect(c.stats.reputation).toBeGreaterThan(rookie.stats.reputation);
  });

  it("empty-dev: Level 1, Aventureiro, no subclass, no skills, goals to pursue", async () => {
    const c = await loadCharacter("empty-dev");
    expect(c.progression.level).toBe(1);
    expect(c.archetype.className).toBe("Aventureiro");
    expect(c.archetype.subclassName).toBeUndefined();
    expect(c.skills).toEqual([]);
    expect(c.achievements.filter((a) => a.unlocked)).toHaveLength(0);
    expect(c.nextMilestones[0].name).toBe("Primeiro Repositório");
  });

  it("never lets a locked, non-exact goal claim what is missing", async () => {
    for (const name of ["rookie-dev", "veteran-dev", "polyglot-dev", "popular-dev", "empty-dev"]) {
      const c = await loadCharacter(name);
      const thresholdTitles = c.titles.filter((t): t is ThresholdTitleProgress => t.kind === "threshold");
      for (const goal of [...c.achievements, ...thresholdTitles]) {
        if (!goal.unlocked && goal.coverage !== "full") {
          expect(goal.remaining, `${name}:${goal.id}`).toBeNull();
        }
      }
    }
  });
});
