import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { makeAverageProfile } from "@/test/builders";
import CharacterPageClient from "./CharacterPageClient";

afterEach(cleanup);

describe("CharacterPageClient: temporarily hidden share actions", () => {
  it("hides the card and README buttons but keeps the duel and class actions", () => {
    const profile = makeAverageProfile({ username: "artorias" });
    const character = createRPGCharacter(profile);
    render(
      <CharacterPageClient
        character={character}
        chronicle={buildDeveloperChronicle(profile)}
        classExplanation={buildClassExplanation(
          character.archetype,
          analyzeLanguages(profile.languages),
          profile.languagesCoverage
        )}
        username={profile.username}
      />
    );
    expect(screen.queryByRole("button", { name: /gerar cartão/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /adicionar ao readme/i })).toBeNull();
    expect(screen.getByRole("link", { name: /desafiar este herói/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /por que esta classe/i })).toBeTruthy();
  });
});
