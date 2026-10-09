import { describe, expect, it, vi } from "vitest";
import { createRPGCharacter } from "@/game/engine";
import type { ClassName, RPGCharacter } from "@/game/types";
import { makeAverageProfile, makeMaxedProfile, makeProfile, m, languagesFromShares } from "@/test/builders";
import { createDuel } from "./createDuel";

function character(username: string, kind: "average" | "maxed" | "empty" = "average"): RPGCharacter {
  const profile = kind === "maxed"
    ? { ...makeMaxedProfile(), languages: languagesFromShares({ TypeScript: 80, Rust: 20 }, 20) }
    : kind === "empty"
      ? makeProfile()
      : makeAverageProfile();
  return createRPGCharacter({ ...profile, username });
}

function mirroredWinner(winner: "A" | "B" | "draw") {
  return winner === "A" ? "B" : winner === "B" ? "A" : "draw";
}

describe("createDuel", () => {
  it("is deeply deterministic and never calls Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const a = character("hero-a");
    const b = character("hero-b", "maxed");
    expect(createDuel(a, b)).toEqual(createDuel(a, b));
    expect(createDuel(a, b)).toEqual(createDuel(a, b));
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it("mirrors every semantic result when the heroes are inverted", () => {
    const a = character("hero-a");
    const b = character("hero-b", "maxed");
    const forward = createDuel(a, b);
    const reverse = createDuel(b, a);
    expect(reverse.scoreA).toBe(forward.scoreB);
    expect(reverse.scoreB).toBe(forward.scoreA);
    expect(reverse.winner).toBe(mirroredWinner(forward.winner));
    forward.rounds.forEach((round, index) => {
      expect(reverse.rounds[index].winner).toBe(mirroredWinner(round.winner));
      expect(reverse.rounds[index].heroA.power).toBe(round.heroB.power);
      expect(reverse.rounds[index].heroB.power).toBe(round.heroA.power);
    });
  });

  it("allows honest round and final draws without a hidden tiebreaker", () => {
    const a = character("hero-a");
    const b = { ...a, identity: { ...a.identity, username: "hero-b" } };
    const result = createDuel(a, b);
    expect(result.winner).toBe("draw");
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(0);
    expect(result.rounds.every((round) => round.winner === "draw" && round.damage === 0)).toBe(true);
  });

  it("always emits the five ordered rounds with clamped power and derived HP", () => {
    const result = createDuel(character("empty", "empty"), character("extreme", "maxed"));
    expect(result.rounds.map((round) => round.id)).toEqual(["journey", "arsenal", "forge", "legacy", "signature"]);
    for (const round of result.rounds) {
      expect(round.heroA.power).toBeGreaterThanOrEqual(0);
      expect(round.heroA.power).toBeLessThanOrEqual(100);
      expect(round.heroB.power).toBeGreaterThanOrEqual(0);
      expect(round.heroB.power).toBeLessThanOrEqual(100);
      expect(round.heroA.hpAfter).toBeGreaterThanOrEqual(0);
      expect(round.heroB.hpAfter).toBeGreaterThanOrEqual(0);
    }
    expect(result.heroA.finalHp).toBe(result.rounds.at(-1)?.heroA.hpAfter);
    expect(result.heroB.finalHp).toBe(result.rounds.at(-1)?.heroB.hpAfter);
  });

  it.each([
    ["Mago", "arsenal"], ["Alquimista", "arsenal"], ["Guerreiro", "forge"],
    ["Patrulheiro", "forge"], ["Paladino", "journey"], ["Bardo", "signature"],
    ["Ladino", "arsenal"], ["Oráculo", "legacy"], ["Escriba", "legacy"],
    ["Sentinela", "journey"], ["Tecelão", "signature"], ["Aventureiro", "signature"],
  ] as const)("applies a small, visible %s modifier only to %s", (className, roundId) => {
    const base = character("hero");
    const custom: RPGCharacter = { ...base, archetype: { ...base.archetype, className: className as ClassName, subclassName: undefined } };
    const result = createDuel(custom, character("opponent", "empty"));
    const modified = result.rounds.find((round) => round.id === roundId)?.heroA.modifier;
    expect(modified?.amount).toBeGreaterThan(0);
    expect(modified?.amount).toBeLessThanOrEqual(6);
    expect(result.rounds.filter((round) => round.heroA.modifier)).toHaveLength(1);
  });

  it("tolerates missing skills, subclass and partial counters", () => {
    const sparse = createRPGCharacter(makeProfile({
      username: "partial",
      commits: m(12, "partial"),
      ownRepositories: m(1, "partial"),
      starsReceived: m(0, "unavailable"),
      languagesCoverage: "unavailable",
    }));
    const result = createDuel(sparse, character("average"));
    expect(result.rounds).toHaveLength(5);
    expect(result.rounds.flatMap((round) => [round.heroA.power, round.heroB.power]).every(Number.isFinite)).toBe(true);
  });
});

describe("Creator Override (section 24 tests)", () => {
  it("1. creator vence normalmente -> NÃO ativa override", () => {
    const creator = character("JonathanNwokolo", "maxed");
    const opponent = character("challenger", "empty");
    const result = createDuel(creator, opponent);
    expect(result.scoreA).toBe(5);
    expect(result.scoreB).toBe(0);
    expect(result.winner).toBe("A");
    expect(result.resultType).toBe("normal");
    expect(result.creatorOverride).toBe(false);
  });

  it("2. creator perde o duelo por 0x4 com um round empatado -> ativa override", () => {
    const creator = createRPGCharacter(makeProfile({ username: "JonathanNwokolo" }));
    const opponent = createRPGCharacter(makeMaxedProfile()); // without languages, arsenal draws
    const result = createDuel(creator, opponent);
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(4);
    expect(result.rounds.filter((r) => r.winner === "draw")).toHaveLength(1);
    expect(result.winner).toBe("A");
    expect(result.resultType).toBe("creator_override");
    expect(result.creatorOverride).toBe(true);
  });

  it("3. creator perde exatamente os 5 rounds -> ativa creator_override", () => {
    const creator = character("JonathanNwokolo", "empty");
    const opponent = character("challenger", "maxed");
    const result = createDuel(creator, opponent);
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(5);
    expect(result.creatorOverride).toBe(true);
    expect(result.resultType).toBe("creator_override");
    expect(result.winner).toBe("A");
  });

  it("4. creator no lado A -> funciona", () => {
    const creator = character("JonathanNwokolo", "empty");
    const opponent = character("challenger", "maxed");
    const result = createDuel(creator, opponent);
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(5);
    expect(result.winner).toBe("A");
    expect(result.resultType).toBe("creator_override");
    expect(result.creatorOverride).toBe(true);
  });

  it("5. creator no lado B -> funciona", () => {
    const opponent = character("challenger", "maxed");
    const creator = character("JonathanNwokolo", "empty");
    const result = createDuel(opponent, creator);
    expect(result.scoreA).toBe(5);
    expect(result.scoreB).toBe(0);
    expect(result.winner).toBe("B");
    expect(result.resultType).toBe("creator_override");
    expect(result.creatorOverride).toBe(true);
  });

  it("6. username com casing diferente e espaços -> funciona", () => {
    for (const raw of ["jonathannwokolo", "JONATHANNWOKOLO", "  JonathanNwokolo  "]) {
      const creator = character(raw, "empty");
      const opponent = character("challenger", "maxed");
      const result = createDuel(creator, opponent);
      expect(result.winner).toBe("A");
      expect(result.resultType).toBe("creator_override");
      expect(result.creatorOverride).toBe(true);
    }
  });

  it("7. duelo sem creator -> comportamento atual inalterado mesmo em 0x5", () => {
    const mortalA = character("regular-user", "empty");
    const mortalB = character("challenger", "maxed");
    const result = createDuel(mortalA, mortalB);
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(5);
    expect(result.winner).toBe("B");
    expect(result.resultType).toBe("normal");
    expect(result.creatorOverride).toBe(false);
  });

  it("8. resultado final oficial -> winner === creator", () => {
    const creator = character("JonathanNwokolo", "empty");
    const opponent = character("challenger", "maxed");
    const result = createDuel(creator, opponent);
    expect(result.winner).toBe("A");
  });

  it("9. histórico -> continua refletindo os rounds reais e danos sem falsificação", () => {
    const creator = character("JonathanNwokolo", "empty");
    const opponent = character("challenger", "maxed");
    const result = createDuel(creator, opponent);
    expect(result.rounds).toHaveLength(5);
    expect(result.scoreA).toBe(0);
    expect(result.scoreB).toBe(5);
    expect(result.rounds.every((r) => r.winner === "B")).toBe(true);
    expect(result.heroA.initialHp).toBe(100);
    expect(result.heroB.initialHp).toBe(100);
    expect(result.heroA.finalHp).toBeLessThan(100);
    expect(result.heroB.finalHp).toBe(100);
  });

  it("10. empate agregado -> preserva Empate Lendário sem override", () => {
    const creator = character("JonathanNwokolo");
    const opponent = character("challenger");
    const result = createDuel(creator, opponent);
    expect(result.scoreA).toBe(result.scoreB);
    expect(result.winner).toBe("draw");
    expect(result.resultType).toBe("legendary_draw");
    expect(result.creatorOverride).toBe(false);
  });
});

