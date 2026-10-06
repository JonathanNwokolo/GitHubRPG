import { describe, expect, it } from "vitest";
import { calculateAccountAge } from "../age";
import { analyzeLanguages } from "../languages";
import { buildProgressMetrics } from "../progress";
import type { AchievementProgress, DeveloperProfile, Rarity } from "../types";
import { languagesFromShares, m, makeProfile } from "@/test/builders";
import { ACHIEVEMENT_DEFINITIONS, evaluateAchievements, selectNextMilestones } from "./achievementList";

function achievementsOf(profile: DeveloperProfile): AchievementProgress[] {
  const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
  return evaluateAchievements(buildProgressMetrics(profile, analyzeLanguages(profile.languages), age));
}

const byId = (list: AchievementProgress[], id: string) => {
  const found = list.find((a) => a.id === id);
  if (!found) throw new Error(`achievement ${id} not found`);
  return found;
};

/** [id, name, rarity, target] straight from the product spec. */
const SPEC: Array<[string, string, Rarity, number]> = [
  ["age-1", "Primeiro Capítulo", "common", 1],
  ["age-3", "Cronista do Código", "rare", 3],
  ["age-5", "Antigo Guardião", "epic", 5],
  ["age-10", "Lenda dos Repositórios", "legendary", 10],
  ["age-15", "Ancião do Código", "legendary", 15],
  ["repos-1", "Primeiro Repositório", "common", 1],
  ["repos-5", "Explorador", "common", 5],
  ["repos-25", "Senhor dos Repositórios", "rare", 25],
  ["repos-50", "Construtor de Reinos", "epic", 50],
  ["repos-100", "Arquiteto de Mundos", "legendary", 100],
  ["commits-100", "Primeiros Golpes", "common", 100],
  ["commits-1000", "Código em Chamas", "rare", 1_000],
  ["commits-5000", "Tempestade de Código", "epic", 5_000],
  ["commits-10000", "Forjador Incansável", "legendary", 10_000],
  ["prs-1", "Primeiro Aliado", "common", 1],
  ["prs-25", "Guardião Open Source", "rare", 25],
  ["prs-100", "Campeão da Colaboração", "epic", 100],
  ["prs-500", "Herói da Comunidade", "legendary", 500],
  ["reviews-10", "Olhar Atento", "common", 10],
  ["reviews-50", "Vigia do Código", "rare", 50],
  ["reviews-200", "Guardião da Qualidade", "epic", 200],
  ["issues-10", "Caçador de Bugs", "common", 10],
  ["issues-50", "Caçador de Recompensas", "rare", 50],
  ["issues-200", "Exterminador de Bugs", "epic", 200],
  ["stars-1", "Primeira Centelha", "common", 1],
  ["stars-25", "Brilho Crescente", "rare", 25],
  ["stars-100", "Constelação", "epic", 100],
  ["stars-1000", "Farol dos Reinos", "legendary", 1_000],
  ["languages-2", "Primeiro Encantamento", "common", 2],
  ["languages-5", "Poliglota", "rare", 5],
  ["languages-8", "Mestre das Afinidades", "epic", 8],
];

describe("achievement catalog", () => {
  it("matches the product spec (name, rarity, target)", () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(SPEC.length);
    for (const [id, name, rarity, target] of SPEC) {
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      expect(def, id).toBeDefined();
      expect(def).toMatchObject({ name, rarity, target });
    }
  });

  it("has unique ids and no reference to the dropped dungeon system", () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(`${def.name} ${def.description}`.toLowerCase()).not.toContain("masmorra");
    }
  });

  it("exposes the full progress shape on every achievement", () => {
    for (const a of achievementsOf(makeProfile())) {
      expect(a).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          rarity: expect.any(String),
          category: expect.any(String),
          target: expect.any(Number),
          unlocked: expect.any(Boolean),
          coverage: expect.any(String),
        })
      );
      expect("current" in a && "progressPercent" in a && "remaining" in a).toBe(true);
    }
  });
});

describe("thresholds (full coverage)", () => {
  const CASES: Array<[string, (n: number) => Partial<DeveloperProfile>, number]> = [
    ["commits-100", (n) => ({ commits: m(n) }), 100],
    ["commits-1000", (n) => ({ commits: m(n) }), 1_000],
    ["commits-5000", (n) => ({ commits: m(n) }), 5_000],
    ["commits-10000", (n) => ({ commits: m(n) }), 10_000],
    ["prs-1", (n) => ({ pullRequests: m(n) }), 1],
    ["prs-25", (n) => ({ pullRequests: m(n) }), 25],
    ["reviews-50", (n) => ({ reviews: m(n) }), 50],
    ["issues-10", (n) => ({ issues: m(n) }), 10],
    ["repos-25", (n) => ({ ownRepositories: m(n) }), 25],
    ["stars-1000", (n) => ({ starsReceived: m(n) }), 1_000],
  ];

  it.each(CASES)("%s: just below, exactly at and above the target", (id, build, target) => {
    const below = byId(achievementsOf(makeProfile(build(target - 1))), id);
    expect(below.unlocked).toBe(false);
    expect(below.current).toBe(target - 1);
    expect(below.remaining).toBe(1);
    expect(below.progressPercent).toBeLessThan(100);

    const exact = byId(achievementsOf(makeProfile(build(target))), id);
    expect(exact.unlocked).toBe(true);
    expect(exact.remaining).toBe(0);
    expect(exact.progressPercent).toBe(100);

    const above = byId(achievementsOf(makeProfile(build(target * 3))), id);
    expect(above.unlocked).toBe(true);
    expect(above.progressPercent).toBe(100);
  });

  it("shows exact current / target / remaining, like 437 / 1000 stars", () => {
    const farol = byId(achievementsOf(makeProfile({ starsReceived: m(437) })), "stars-1000");
    expect(farol).toMatchObject({ current: 437, target: 1_000, remaining: 563, unlocked: false, coverage: "full" });
    expect(farol.progressPercent).toBe(43.7);
  });

  it("language achievements use relevant languages (>= 5%)", () => {
    const profile = makeProfile({
      languages: languagesFromShares({ A: 50, B: 30, C: 15, D: 4, E: 1 }),
    });
    const list = achievementsOf(profile);
    expect(byId(list, "languages-2").unlocked).toBe(true);
    expect(byId(list, "languages-5")).toMatchObject({ unlocked: false, current: 3, remaining: 2 });
  });
});

describe("account age achievements", () => {
  const profileOfAge = (createdAt: string, reference = "2026-10-01T00:00:00Z") =>
    makeProfile({ accountCreatedAt: createdAt, referenceDate: reference });

  it("are cumulative: an 11-year account holds 1, 3, 5 and 10 but not 15", () => {
    const list = achievementsOf(profileOfAge("2015-05-20T08:00:00Z"));
    expect(["age-1", "age-3", "age-5", "age-10"].every((id) => byId(list, id).unlocked)).toBe(true);
    const next = byId(list, "age-15");
    expect(next.unlocked).toBe(false);
    expect(next.current).toBe(11.3);
    expect(next.target).toBe(15);
  });

  it("uses the full date: December account does not complete 5 years in January", () => {
    const list = achievementsOf(profileOfAge("2021-12-15T00:00:00Z", "2026-01-10T00:00:00Z"));
    expect(byId(list, "age-5").unlocked).toBe(false);
    expect(byId(list, "age-3").unlocked).toBe(true);
  });

  it("unlocks exactly on the anniversary", () => {
    const exact = achievementsOf(profileOfAge("2021-10-01T00:00:00Z", "2026-10-01T00:00:00Z"));
    expect(byId(exact, "age-5").unlocked).toBe(true);
    const oneDayShort = achievementsOf(profileOfAge("2021-10-02T00:00:00Z", "2026-10-01T00:00:00Z"));
    expect(byId(oneDayShort, "age-5").unlocked).toBe(false);
  });

  it("shows years with one decimal and remaining rounded up (4.2 / 5 years)", () => {
    const list = achievementsOf(profileOfAge("2022-07-07T11:00:00Z"));
    const guardian = byId(list, "age-5");
    expect(guardian).toMatchObject({ unit: "years", current: 4.2, target: 5, unlocked: false });
    // 5 - 4.24... = 0.75... years, rounded up to 0.8 (about 10 months)
    expect(guardian.remaining).toBe(0.8);
  });

  it("never displays a locked age goal as complete", () => {
    const almost = byId(achievementsOf(profileOfAge("2021-10-02T00:00:00Z")), "age-5");
    expect(almost.unlocked).toBe(false);
    expect(almost.current!).toBeLessThan(5);
    expect(almost.progressPercent!).toBeLessThan(100);
    expect(almost.remaining!).toBeGreaterThan(0);
  });
});

describe("partial coverage", () => {
  it("unlocks when the partial lower bound already passes the target", () => {
    const list = achievementsOf(makeProfile({ commits: m(1_240, "partial") }));
    const flames = byId(list, "commits-1000");
    expect(flames.unlocked).toBe(true);
    expect(flames.current).toBe(1_240);
    expect(flames.remaining).toBe(0);
    expect(flames.coverage).toBe("partial");
  });

  it("does NOT claim what is missing when partial data is still below the target", () => {
    const list = achievementsOf(makeProfile({ commits: m(240, "partial") }));
    const flames = byId(list, "commits-1000");
    expect(flames.unlocked).toBe(false);
    expect(flames.current).toBe(240); // "at least 240 found"
    expect(flames.remaining).toBeNull(); // never "760 remaining"
    expect(flames.progressPercent).toBeNull();
  });

  it("never invents a value when the metric is unavailable", () => {
    const list = achievementsOf(makeProfile({ reviews: m(0, "unavailable") }));
    const eye = byId(list, "reviews-10");
    expect(eye).toMatchObject({
      unlocked: false,
      current: null,
      remaining: null,
      progressPercent: null,
      coverage: "unavailable",
    });
  });

  it("no locked, non-exact achievement ever carries remaining or percent", () => {
    const profile = makeProfile({
      commits: m(300, "partial"),
      pullRequests: m(0, "unavailable"),
      reviews: m(3, "partial"),
    });
    for (const a of achievementsOf(profile)) {
      if (!a.unlocked && a.coverage !== "full") {
        expect(a.remaining, a.id).toBeNull();
        expect(a.progressPercent, a.id).toBeNull();
      }
    }
  });
});

describe("next milestones", () => {
  it("gives an empty profile its first steps", () => {
    const next = selectNextMilestones(achievementsOf(makeProfile({ accountCreatedAt: "2026-01-01T00:00:00Z" })));
    expect(next.map((a) => a.name)).toEqual(["Primeiro Repositório", "Primeiros Golpes", "Primeiro Aliado"]);
    expect(next[0]).toMatchObject({ current: 0, target: 1 });
  });

  it("proposes the closest goal first, one per category, never an unlocked one or age", () => {
    const next = selectNextMilestones(
      achievementsOf(makeProfile({ commits: m(90), ownRepositories: m(1), accountCreatedAt: "2010-01-01T00:00:00Z" }))
    );
    expect(next[0].id).toBe("commits-100");
    expect(new Set(next.map((a) => a.category)).size).toBe(next.length);
    expect(next.every((a) => !a.unlocked && a.category !== "age")).toBe(true);
  });
});
