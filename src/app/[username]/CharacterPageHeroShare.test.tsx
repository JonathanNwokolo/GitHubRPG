import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { createCharacterPresentationModel } from "@/game-v2/publicProjection";
import { m, makeAverageProfile } from "@/test/builders";
import { useUiStore } from "@/stores/useUiStore";
import CharacterPageClient from "./CharacterPageClient";

// The old card and README buttons stay hidden (product decision): "Share Hero" must not depend on that flag.
vi.mock("./shareActions", () => ({ SHARE_ACTIONS_ENABLED: false }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async () => new Response(new Blob(["png"], { type: "image/png" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn().mockReturnValue("blob:card");
  URL.revokeObjectURL = vi.fn();
});

afterEach(async () => {
  await act(async () => undefined);
  cleanup();
  useUiStore.setState({ language: "pt-BR" });
  vi.unstubAllGlobals();
});

function pageFor(profile = makeAverageProfile({ username: "artorias" })) {
  const character = createRPGCharacter(profile);
  return (
    <CharacterPageClient
      character={character}
      chronicle={buildDeveloperChronicle(profile)}
      classExplanation={buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage)}
      username={profile.username}
    />
  );
}

describe("CharacterPageClient: Share Hero", () => {
  it("adds the button next to the duel, while the old card and README buttons stay hidden", () => {
    render(pageFor());

    expect(screen.getByRole("button", { name: "Compartilhar Herói" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /desafiar este herói/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /gerar cartão/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /adicionar ao readme/i })).toBeNull();
  });

  it("is translated", () => {
    useUiStore.setState({ language: "en" });
    render(pageFor());
    expect(screen.getByRole("button", { name: "Share Hero" })).toBeInTheDocument();
  });

  it("is not offered when the calculated numbers cannot be published", () => {
    render(pageFor(makeAverageProfile({ username: "artorias", commits: m(0, "unavailable") })));
    expect(screen.queryByRole("button", { name: "Compartilhar Herói" })).toBeNull();
  });

  it("opens the dialog with the card of this hero, and closes it giving the focus back", async () => {
    render(pageFor());
    const button = screen.getByRole("button", { name: "Compartilhar Herói" });
    button.focus();

    await act(async () => {
      fireEvent.click(button);
    });

    const dialog = await screen.findByRole("dialog", { name: "Compartilhar Herói" });
    expect(dialog).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Pré-visualização da Carta Social do Herói de artorias/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/api\/card\/artorias\/social(\?title=[\w:.-]+)?$/);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(button);
  });

  it("with V2, the post names the V2 class the sheet shows", async () => {
    const fixture = GOLDEN_FIXTURES.architecturalSystem();
    const profile = fixture.profile;
    const character = createRPGCharacter(profile);
    const v2 = createRPGCharacterV2(fixture);
    const presentation = createCharacterPresentationModel(true, { state: "ready", character: v2 });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true, writable: true });

    render(
      <CharacterPageClient
        character={character}
        chronicle={buildDeveloperChronicle(profile)}
        classExplanation={buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage)}
        username={profile.username}
        presentation={presentation}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Compartilhar Herói" }));
    });
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Copiar texto" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain(`Classe: ${presentation.v2!.identity.className}`);
  });
});
