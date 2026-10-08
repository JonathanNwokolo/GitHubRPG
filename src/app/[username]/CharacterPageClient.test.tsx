import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { makeAverageProfile, makeProfile } from "@/test/builders";
import { useUiStore } from "@/stores/useUiStore";
import CharacterPageClient from "./CharacterPageClient";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { createCharacterPresentationModel } from "@/game-v2/publicProjection";

beforeEach(() => {
  // The share modal draws on a canvas, which jsdom does not implement.
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(
    new Proxy({}, { get: () => vi.fn().mockReturnValue({ addColorStop: vi.fn(), width: 100 }) })
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mocked");
});

afterEach(() => {
  useUiStore.setState({ language: "pt-BR" });
});

function renderPage(profile = makeAverageProfile({ username: "artorias" })) {
  const character = createRPGCharacter(profile);
  return render(
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
}

function renderV2Page() {
  const fixture = GOLDEN_FIXTURES.architecturalSystem();
  const profile = fixture.profile;
  const character = createRPGCharacter(profile);
  const v2 = createRPGCharacterV2(fixture);
  return render(
    <CharacterPageClient
      character={character}
      chronicle={buildDeveloperChronicle(profile)}
      classExplanation={buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage)}
      username={profile.username}
      presentation={createCharacterPresentationModel(true, { state: "ready", character: v2 })}
    />
  );
}

describe("CharacterPageClient: tabs and panel", () => {
  it("the selected tab and the panel reference each other, and follow the tab change", () => {
    renderPage();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);

    const panel = screen.getByRole("tabpanel");
    const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    expect(selected).toBeDefined();
    expect(selected?.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(selected?.id);

    fireEvent.click(screen.getByRole("tab", { name: /Habilidades/i }));

    const nextPanel = screen.getByRole("tabpanel");
    const nextSelected = screen.getByRole("tab", { name: /Habilidades/i });
    expect(nextSelected).toHaveAttribute("aria-selected", "true");
    expect(nextSelected.getAttribute("aria-controls")).toBe(nextPanel.id);
    expect(nextPanel.getAttribute("aria-labelledby")).toBe(nextSelected.id);
    expect(nextPanel).toHaveAccessibleName(/Habilidades/i);
  });

  it("every aria-controls on the page points at an element that exists", () => {
    const { container } = renderPage();

    for (const element of container.querySelectorAll("[aria-controls]")) {
      const target = element.getAttribute("aria-controls") as string;
      expect(document.getElementById(target), `#${target}`).not.toBeNull();
    }
  });

  it("names the tab list in the interface language", () => {
    renderPage();
    expect(screen.getByRole("tablist", { name: "Seções da ficha" })).toBeInTheDocument();
  });
});

describe("CharacterPageClient: sparse profile", () => {
  it("explains a profile with almost no public data", () => {
    renderPage(makeProfile({ username: "empty-dev" }));

    expect(screen.getByText("Este perfil possui poucos dados públicos disponíveis para formar a ficha.")).toBeInTheDocument();
  });

  it("explains it in English", () => {
    useUiStore.setState({ language: "en" });
    renderPage(makeProfile({ username: "empty-dev" }));

    expect(screen.getByText("This profile has little public data available to build the sheet.")).toBeInTheDocument();
  });

  it("does not show the note on a normal profile", () => {
    renderPage();
    expect(screen.queryByText(/poucos dados públicos/)).not.toBeInTheDocument();
  });
});

describe("CharacterPageClient: share modal", () => {
  it("is not mounted until it is opened, then restores focus to the opener when closed", async () => {
    renderPage();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const opener = screen.getByRole("button", { name: /Gerar Cartão de Herói/i });
    opener.focus();
    fireEvent.click(opener);

    expect(await screen.findByRole("dialog", { name: "Cartão de Aventureiro" }, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartilhar perfil" })).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(opener);
  });
});

describe("CharacterPageClient: V2 product presentation", () => {
  it("shows the specialization and Grimoire while preserving the four-tab structure", () => {
    renderV2Page();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByText("Arquiteto", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grimório do Herói" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Afinidades" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Escolas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Artefatos" })).toBeInTheDocument();
  });

  it("uses 54 achievements, 40 titles and keeps locked secrets redacted", () => {
    renderV2Page();
    fireEvent.click(screen.getByRole("tab", { name: /Conquistas/i }));
    expect(screen.getByText(/\/ 54/)).toBeInTheDocument();
    expect(screen.getAllByText("???").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: /Títulos/i }));
    expect(screen.getByRole("tab", { name: /Títulos.*40/i })).toBeInTheDocument();
  });

  it("switches the new product copy to English", () => {
    useUiStore.setState({ language: "en" });
    renderV2Page();
    expect(screen.getByRole("heading", { name: "Hero's Grimoire" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Why this class?" }));
    expect(screen.getByRole("heading", { name: /Specialization/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Evolution/ })).toBeInTheDocument();
  });
});
