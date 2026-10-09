import { describe, expect, it } from "vitest";
import { createRPGCharacter } from "@/game/engine";
import { makeAverageProfile, makeProfile } from "@/test/builders";
import {
  CREATOR_GITHUB_USERNAME,
  evaluateCreatorOverride,
  isCreatorUsername,
  normalizeDuelUsername,
} from "./creatorOverride";

describe("creatorOverride module", () => {
  it("centralizes the correct creator username", () => {
    expect(CREATOR_GITHUB_USERNAME).toBe("JonathanNwokolo");
  });

  it("normalizes usernames with whitespace and case insensitivity", () => {
    expect(normalizeDuelUsername("  JonathanNwokolo  ")).toBe("jonathannwokolo");
    expect(normalizeDuelUsername("JONATHANNWOKOLO")).toBe("jonathannwokolo");
    expect(normalizeDuelUsername("jonathannwokolo")).toBe("jonathannwokolo");
  });

  it("recognizes the creator regardless of casing or whitespace", () => {
    expect(isCreatorUsername("JonathanNwokolo")).toBe(true);
    expect(isCreatorUsername("jonathannwokolo")).toBe(true);
    expect(isCreatorUsername("JONATHANNWOKOLO")).toBe(true);
    expect(isCreatorUsername("  JonathanNwokolo ")).toBe(true);
    expect(isCreatorUsername("torvalds")).toBe(false);
    expect(isCreatorUsername("")).toBe(false);
    expect(isCreatorUsername(null)).toBe(false);
    expect(isCreatorUsername(undefined)).toBe(false);
  });

  describe("evaluateCreatorOverride logic", () => {
    const creator = createRPGCharacter(makeProfile({ username: "JonathanNwokolo" }));
    const challenger = createRPGCharacter(makeAverageProfile({ username: "challenger" }));
    const regular = createRPGCharacter(makeProfile({ username: "regular" }));

    it.each([
      [2, 3],
      [1, 4],
      [0, 5],
    ])("triggers when creator is side A and loses %ix%i", (scoreA, scoreB) => {
      expect(evaluateCreatorOverride(creator, challenger, scoreA, scoreB)).toEqual({
        triggered: true,
        creatorSide: "A",
      });
    });

    it.each([
      [3, 2],
      [4, 1],
      [5, 0],
    ])("triggers when creator is side B and loses %ix%i", (scoreA, scoreB) => {
      expect(evaluateCreatorOverride(challenger, creator, scoreA, scoreB)).toEqual({
        triggered: true,
        creatorSide: "B",
      });
    });

    it.each([
      [5, 0],
      [4, 1],
      [3, 2],
    ])("does not trigger when creator is side A and wins %ix%i", (scoreA, scoreB) => {
      expect(evaluateCreatorOverride(creator, challenger, scoreA, scoreB)).toEqual({
        triggered: false,
        creatorSide: null,
      });
    });

    it.each([
      [0, 5],
      [2, 3],
    ])("does not trigger when creator is side B and wins %ix%i", (scoreA, scoreB) => {
      expect(evaluateCreatorOverride(challenger, creator, scoreA, scoreB)).toEqual({
        triggered: false,
        creatorSide: null,
      });
    });

    it("does not trigger on an aggregate draw", () => {
      expect(evaluateCreatorOverride(creator, challenger, 2, 2)).toEqual({
        triggered: false,
        creatorSide: null,
      });
      expect(evaluateCreatorOverride(challenger, creator, 2, 2)).toEqual({
        triggered: false,
        creatorSide: null,
      });
    });

    it("does NOT trigger for non-creator profiles even on a 0x5 blowout", () => {
      expect(evaluateCreatorOverride(regular, challenger, 0, 5)).toEqual({
        triggered: false,
        creatorSide: null,
      });
      expect(evaluateCreatorOverride(challenger, regular, 5, 0)).toEqual({
        triggered: false,
        creatorSide: null,
      });
    });
  });
});
