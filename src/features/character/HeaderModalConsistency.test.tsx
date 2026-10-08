import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { useUiStore } from "@/stores/useUiStore";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { createCharacterPresentationModel, type RPGCharacterV2Public } from "@/game-v2/publicProjection";
import CharacterPageClient from "@/app/[username]/CharacterPageClient";

vi.mock("@/app/[username]/shareActions", () => ({ SHARE_ACTIONS_ENABLED: true }));

beforeEach(() => {
  useUiStore.setState({ language: "pt-BR" });
});
afterEach(() => useUiStore.setState({ language: "pt-BR" }));

const fixture = GOLDEN_FIXTURES.architecturalSystem();
const profile = fixture.profile;
const baseV2 = createCharacterPresentationModel(true, { state: "ready", character: createRPGCharacterV2(fixture) }).v2 as RPGCharacterV2Public;

const GUERREIRO = { pt: "Guerreiro", en: "Warrior" };
const EVOLUTION = { pt: "Mestre Teste", en: "Test Master" };

type Shape = { subclass: boolean; evolution: boolean };

function shapeV2(shape: Shape): RPGCharacterV2Public {
  return {
    ...baseV2,
    identity: {
      ...baseV2.identity,
      className: "Bardo",
      subclass: shape.subclass ? { id: baseV2.identity.subclass?.id ?? ("systems" as never), name: GUERREIRO } : null,
      evolution: shape.evolution ? { id: "test", name: EVOLUTION, rarity: "rare" as never } : null,
    },
    explanation: {
      class: { name: "Bardo", reason: { pt: "Razão da classe", en: "Class reason" } },
      subclass: shape.subclass
        ? { name: GUERREIRO, reason: { pt: "Razão da subclasse", en: "Subclass reason" }, status: baseV2.explanation.subclass.status }
        : { name: null, reason: { pt: "Sem evidência suficiente", en: "No evidence" }, status: baseV2.explanation.subclass.status },
      evolution: shape.evolution
        ? { name: EVOLUTION, reason: { pt: "Razão da evolução", en: "Evolution reason" }, status: baseV2.explanation.evolution.status }
        : { name: null, reason: { pt: "Sem evolução", en: "No evolution" }, status: baseV2.explanation.evolution.status },
    },
  };
}

function renderPage(v2: RPGCharacterV2Public | null, v1Subclass: string | null = null) {
  const character = createRPGCharacter(profile);
  character.archetype = { ...character.archetype, subclassName: (v1Subclass as never) ?? undefined };
  const props = (model: ReturnType<typeof createCharacterPresentationModel>) => ({
    character,
    chronicle: buildDeveloperChronicle(profile),
    classExplanation: buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage),
    username: profile.username,
    presentation: model,
  });
  const model = (value: RPGCharacterV2Public | null) =>
    value ? { v2Enabled: true, delivery: "ready" as const, v2: value } : { v2Enabled: true, delivery: "unavailable" as const, v2: null };
  const view = render(<CharacterPageClient {...props(model(v2))} />);
  return { ...view, character, rerenderWith: (next: RPGCharacterV2Public | null) => view.rerender(<CharacterPageClient {...props(model(next))} />) };
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /Por que esta classe\?/i }));
  return screen.getByRole("dialog");
}

describe("header and 'Por que esta classe?' share one V2 result", () => {
  it("class without subclass: sheet shows only the class, modal says there is no specialization", () => {
    renderPage(shapeV2({ subclass: false, evolution: false }));
    expect(screen.queryByText("Guerreiro")).toBeNull();
    const dialog = openDialog();
    expect(within(dialog).getByText("Sem evidência suficiente")).toBeTruthy();
  });

  it("V1 subclass never leaks into the sheet when V2 has none (the gvanrossum bug)", () => {
    renderPage(shapeV2({ subclass: false, evolution: false }), "Guerreiro");
    expect(screen.queryByText("Guerreiro")).toBeNull();
    const dialog = openDialog();
    expect(within(dialog).getByText("Sem evidência suficiente")).toBeTruthy();
    expect(within(dialog).queryByText("Guerreiro")).toBeNull();
  });

  it("class + subclass: sheet and modal show the same subclass with its own reason", () => {
    renderPage(shapeV2({ subclass: true, evolution: false }));
    expect(screen.getAllByText("Guerreiro").length).toBeGreaterThan(0);
    const dialog = openDialog();
    expect(within(dialog).getByText("Guerreiro")).toBeTruthy();
    expect(within(dialog).getByText("Razão da subclasse")).toBeTruthy();
    expect(within(dialog).queryByText("Sem evidência suficiente")).toBeNull();
  });

  it("class + subclass + evolution: modal matches all three", () => {
    renderPage(shapeV2({ subclass: true, evolution: true }));
    expect(screen.getByText(/Mestre Teste/)).toBeTruthy();
    const dialog = openDialog();
    expect(within(dialog).getByText("Razão da classe")).toBeTruthy();
    expect(within(dialog).getByText("Guerreiro")).toBeTruthy();
    expect(within(dialog).getByText("Mestre Teste")).toBeTruthy();
    expect(within(dialog).getByText("Razão da evolução")).toBeTruthy();
  });

  it("no stale snapshot: V2 arriving after the first render shows up in the modal", () => {
    const view = renderPage(shapeV2({ subclass: false, evolution: false }));
    view.rerenderWith(shapeV2({ subclass: true, evolution: false }));
    const dialog = openDialog();
    expect(within(dialog).getByText("Guerreiro")).toBeTruthy();
    expect(within(dialog).getByText("Razão da subclasse")).toBeTruthy();
  });

  it("V1 fallback still shows the V1 subclass when there is no V2", () => {
    renderPage(null, "Guerreiro");
    expect(screen.getAllByText("Guerreiro").length).toBeGreaterThan(0);
  });
});
