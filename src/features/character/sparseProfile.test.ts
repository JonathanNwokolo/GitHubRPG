import { describe, expect, it } from "vitest";
import { createRPGCharacter } from "@/game/createCharacter";
import { languagesFromShares, m, makeAverageProfile, makeProfile } from "@/test/builders";
import { hasSparsePublicData } from "./sparseProfile";

describe("hasSparsePublicData", () => {
  it("is true for a profile with nothing public to build a sheet from", () => {
    expect(hasSparsePublicData(createRPGCharacter(makeProfile({ languages: [] })))).toBe(true);
  });

  it("is false for a normal profile", () => {
    expect(hasSparsePublicData(createRPGCharacter(makeAverageProfile()))).toBe(false);
  });

  it("is false as soon as there is any repository, language or commit", () => {
    expect(hasSparsePublicData(createRPGCharacter(makeProfile({ ownRepositories: m(1) })))).toBe(false);
    expect(hasSparsePublicData(createRPGCharacter(makeProfile({ commits: m(5) })))).toBe(false);
    expect(
      hasSparsePublicData(createRPGCharacter(makeProfile({ languages: languagesFromShares({ Go: 100 }, 1) })))
    ).toBe(false);
  });
});
