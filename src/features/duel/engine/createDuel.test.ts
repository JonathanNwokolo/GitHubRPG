import { describe, expect, it, vi } from "vitest";
import { createRPGCharacter } from "@/game/engine";
import type { ClassName, RPGCharacter } from "@/game/types";
import { makeAverageProfile, makeMaxedProfile, makeProfile, m } from "@/test/builders";
import { createDuel } from "./createDuel";

function character(username: string, kind: "average" | "maxed" | "empty" = "average"): RPGCharacter {
  const profile = kind === "maxed" ? makeMaxedProfile() : kind === "empty" ? makeProfile() : makeAverageProfile();
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

