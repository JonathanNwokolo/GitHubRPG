import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { makeAverageProfile, makeProfile, m } from "@/test/builders";
import { useUiStore } from "@/stores/useUiStore";
import CharacterPageClient from "./CharacterPageClient";

// The two share buttons are hidden in production; these tests exercise them with the flag on.
vi.mock("./shareActions", () => ({ SHARE_ACTIONS_ENABLED: true }));
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
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

describe("CharacterPageClient: partial calculation coverage", () => {
  it("keeps reliable data but hides degraded level, XP and affected attributes", () => {
    renderPage(makeAverageProfile({ commits: m(0, "unavailable") }));

    expect(screen.getByText("Ficha parcialmente revelada")).toBeInTheDocument();
    expect(screen.getAllByText("Indisponível no momento").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Atividade: Indisponível")).toBeInTheDocument();
    expect(screen.getByLabelText("Reputação")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gerar Cartão de Herói/i })).not.toBeInTheDocument();
  });

  it("provides the same state in English", () => {
    useUiStore.setState({ language: "en" });
    renderPage(makeAverageProfile({ commits: m(0, "unavailable") }));
    expect(screen.getByText("Character sheet partially revealed")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity: Unavailable")).toBeInTheDocument();
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
  it("adopts the V2 result automatically after a cold production response", async () => {
    vi.useFakeTimers();
    const fixture = GOLDEN_FIXTURES.architecturalSystem();
    const profile = fixture.profile;
    const character = createRPGCharacter(profile);
    const projected = createCharacterPresentationModel(true, {
      state: "ready",
      character: createRPGCharacterV2(fixture),
    }).v2;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      contractVersion: 1,
      engineVersion: "2.0-experimental-v24-evo",
      schemaVersion: "game-engine-v2-schema-3",
      state: "ready",
      terminal: true,
      character: projected,
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    render(
      <CharacterPageClient
        character={character}
        chronicle={buildDeveloperChronicle(profile)}
        classExplanation={buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage)}
        username={profile.username}
        presentation={{ v2Enabled: true, delivery: "enriching", v2: null }}
      />
    );

    expect(screen.getByText("Invocando sua ficha...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Conquistas/i })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(screen.getByRole("heading", { name: "Grimório do Herói" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Conquistas.*54/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Títulos.*40/i })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      `/api/experimental/v2/characters/${encodeURIComponent(profile.username)}`,
      expect.objectContaining({ cache: "no-store", credentials: "omit" })
    );
  });

  it.each(["ready", "partial"] as const)("renders the V2 sheet immediately for %s", (state) => {
    const fixture = GOLDEN_FIXTURES.architecturalSystem();
    const profile = fixture.profile;
    const character = createRPGCharacter(profile);
    render(
      <CharacterPageClient
        character={character}
        chronicle={buildDeveloperChronicle(profile)}
        classExplanation={buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage)}
        username={profile.username}
        presentation={createCharacterPresentationModel(true, { state, character: createRPGCharacterV2(fixture) })}
      />
    );
    expect(screen.getByRole("heading", { name: "Grimório do Herói" })).toBeInTheDocument();
    expect(screen.queryByText("Invocando sua ficha...")).not.toBeInTheDocument();
  });

  it("uses V1 only for an unavailable V2 result and explains the fallback", () => {
    const profile = makeAverageProfile({ username: "fallback-dev" });
    const character = createRPGCharacter(profile);
    render(
      <CharacterPageClient
        character={character}
        chronicle={buildDeveloperChronicle(profile)}
        classExplanation={buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage)}
        username={profile.username}
        presentation={{ v2Enabled: true, delivery: "unavailable", v2: null }}
      />
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("A análise avançada não pôde ser concluída. Exibindo a ficha básica.")).toBeInTheDocument();
  });

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
