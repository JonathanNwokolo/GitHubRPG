import { describe, expect, it } from "vitest";
import { createRPGCharacter } from "@/game/engine";
import { makeAverageProfile, makeProfile } from "@/test/builders";
import {
  CREATOR_GITHUB_USERNAME,
  computeOfficialDuelScore,
  evaluateCreatorOverride,
  getOfficialDuelScore,
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

  describe("computeOfficialDuelScore & score inversion rule", () => {
    it("inverts 3x2 defeat so Creator officially wins 3x2 while preserving raw scores", () => {
      // Creator is Side B (raw: Opponent 3 x 2 Creator)
      const resB = computeOfficialDuelScore(3, 2, "B");
      expect(resB.inverted).toBe(true);
      expect(resB.creatorScore).toBe(3);
      expect(resB.opponentScore).toBe(2);
      expect(resB.scoreA).toBe(2); // Opponent gets 2
      expect(resB.scoreB).toBe(3); // Creator gets 3
      expect(resB.rawScoreA).toBe(3);
      expect(resB.rawScoreB).toBe(2);

      // Creator is Side A (raw: Creator 2 x 3 Opponent)
      const resA = computeOfficialDuelScore(2, 3, "A");
      expect(resA.inverted).toBe(true);
      expect(resA.creatorScore).toBe(3);
      expect(resA.opponentScore).toBe(2);
      expect(resA.scoreA).toBe(3); // Creator gets 3
      expect(resA.scoreB).toBe(2); // Opponent gets 2
      expect(resA.rawScoreA).toBe(2);
      expect(resA.rawScoreB).toBe(3);
    });

    it("inverts 4x1 defeat so Creator officially wins 4x1 (e.g. Guido vs Jonathan case)", () => {
      // Guido (A) 4 x 1 Jonathan (B)
      const result = computeOfficialDuelScore(4, 1, "B");
      expect(result.inverted).toBe(true);
      expect(result.creatorScore).toBe(4);
      expect(result.opponentScore).toBe(1);
      expect(result.scoreA).toBe(1); // Guido
      expect(result.scoreB).toBe(4); // Jonathan
      expect(result.rawScoreA).toBe(4);
      expect(result.rawScoreB).toBe(1);
    });

    it("inverts 5x0 blowout defeat so Creator officially wins 5x0", () => {
      const result = computeOfficialDuelScore(5, 0, "B");
      expect(result.inverted).toBe(true);
      expect(result.creatorScore).toBe(5);
      expect(result.opponentScore).toBe(0);
      expect(result.scoreA).toBe(0);
      expect(result.scoreB).toBe(5);
      expect(result.rawScoreA).toBe(5);
      expect(result.rawScoreB).toBe(0);
    });

    it("does NOT invert when Creator wins normally (e.g. 3x2, 4x1, 5x0)", () => {
      // Creator on side A winning 4x1
      const winA = computeOfficialDuelScore(4, 1, "A");
      expect(winA.inverted).toBe(false);
      expect(winA.scoreA).toBe(4);
      expect(winA.scoreB).toBe(1);
      expect(winA.creatorScore).toBe(4);
      expect(winA.opponentScore).toBe(1);

      // Creator on side B winning 3x2
      const winB = computeOfficialDuelScore(2, 3, "B");
      expect(winB.inverted).toBe(false);
      expect(winB.scoreA).toBe(2);
      expect(winB.scoreB).toBe(3);
    });

    it("does NOT invert on a draw (e.g. 2x2)", () => {
      const draw = computeOfficialDuelScore(2, 2, "A");
      expect(draw.inverted).toBe(false);
      expect(draw.scoreA).toBe(2);
      expect(draw.scoreB).toBe(2);
    });

    it("does NOT invert when there is no creator in the duel", () => {
      const noCreator = computeOfficialDuelScore(4, 1, null);
      expect(noCreator.inverted).toBe(false);
      expect(noCreator.scoreA).toBe(4);
      expect(noCreator.scoreB).toBe(1);
    });

    it("getOfficialDuelScore helper returns mapped projection from DuelResult", () => {
      const duelMock = {
        scoreA: 4,
        scoreB: 1,
        creatorOverride: true,
        winner: "B" as const,
      };
      const official = getOfficialDuelScore(duelMock);
      expect(official.inverted).toBe(true);
      expect(official.creatorSide).toBe("B");
      expect(official.creatorScore).toBe(4);
      expect(official.opponentScore).toBe(1);
      expect(official.scoreA).toBe(1);
      expect(official.scoreB).toBe(4);
    });
  });
});
