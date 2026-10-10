import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { buildActivityFlame } from "@/features/activity-flame/buildActivityFlame";
import { calendarOf, sparseYear } from "@/features/activity-flame/testing/fixtures";
import { makeAverageProfile } from "@/test/builders";
import { useUiStore } from "@/stores/useUiStore";
import CharacterPageClient from "./CharacterPageClient";

vi.mock("./shareActions", () => ({ SHARE_ACTIONS_ENABLED: false }));

afterEach(() => {
  cleanup();
  useUiStore.setState({ language: "pt-BR" });
});

const FLAME = buildActivityFlame({
  calendar: calendarOf({ 2026: sparseYear(2026, { "2026-09-01": 3, "2026-09-02": 1 }, "2026-10-09") }),
  createdAt: "2026-01-01T00:00:00Z",
  referenceDate: "2026-10-09T00:00:00Z",
});

function renderPage(withFlame: boolean) {
  const profile = makeAverageProfile({ username: "artorias" });
  const character = createRPGCharacter(profile);
  return render(
    <CharacterPageClient
      character={character}
      chronicle={buildDeveloperChronicle(profile)}
      activityFlame={withFlame ? FLAME : undefined}
      classExplanation={buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage)}
      username={profile.username}
    />
  );
}

describe("CharacterPageClient: Chama da Atividade", () => {
  it("sits right below the Chronicle and above the technical attributes, on the sheet tab", () => {
    renderPage(true);
    const chronicle = document.getElementById("chronicle")!;
    const flame = screen.getByRole("region", { name: "Chama da Atividade" });
    const attributes = screen.getByRole("heading", { name: /Atributos/i });

    expect(chronicle.compareDocumentPosition(flame) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(flame.compareDocumentPosition(attributes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chronicle.nextElementSibling).toBe(flame);
  });

  it("adds no tab to the sheet: its year picker is a single-choice group, not a second set of tabs", () => {
    renderPage(true);

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("radiogroup", { name: "Anos da jornada" })).toBeInTheDocument();
  });

  it("belongs to the sheet tab only", () => {
    renderPage(true);
    fireEvent.click(screen.getAllByRole("tab")[1]);

    expect(screen.queryByRole("region", { name: "Chama da Atividade" })).not.toBeInTheDocument();
  });

  it("is simply absent for a caller that has no calendar model", () => {
    renderPage(false);

    expect(screen.queryByRole("region", { name: "Chama da Atividade" })).not.toBeInTheDocument();
    expect(document.getElementById("chronicle")).toBeInTheDocument();
  });
});
