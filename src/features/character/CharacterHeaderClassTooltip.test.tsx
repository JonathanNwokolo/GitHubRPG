import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { RpgClassIcon } from "@/design-system";
import { createRPGCharacter } from "@/game/createCharacter";
import { CLASS_DESCRIPTIONS } from "@/game/classes/classMatrix";
import type { ClassName } from "@/game/types";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { createCharacterPresentationModel, type RPGCharacterV2Public } from "@/game-v2/publicProjection";
import { useUiStore } from "@/stores/useUiStore";
import { CharacterHeader } from "./CharacterHeader";

beforeEach(() => useUiStore.setState({ language: "pt-BR" }));

const fixture = GOLDEN_FIXTURES.architecturalSystem();
const baseV2 = createCharacterPresentationModel(true, { state: "ready", character: createRPGCharacterV2(fixture) }).v2 as RPGCharacterV2Public;

function v1Character(className: ClassName) {
  const character = createRPGCharacter(fixture.profile);
  character.archetype = { ...character.archetype, className, classDescription: CLASS_DESCRIPTIONS[className] };
  return character;
}

function v2WithClass(className: ClassName, reason = { pt: `Razão V2 de ${className}.`, en: `V2 reason for ${className}.` }): RPGCharacterV2Public {
  return {
    ...baseV2,
    identity: { ...baseV2.identity, className },
    explanation: { ...baseV2.explanation, class: { name: className, reason } },
  };
}

/** Hovers the class label and returns the tooltip text, or null when no tooltip opens. */
function hoverClassTooltip(container: HTMLElement, className: string) {
  const label = Array.from(container.querySelectorAll("span")).find((el) => el.textContent === className);
  expect(label, `class label "${className}"`).toBeTruthy();
  act(() => {
    fireEvent.mouseEnter(label!.closest("div")!);
  });
  return container.querySelector('[role="tooltip"]')?.textContent ?? null;
}

describe("CharacterHeader class tooltip follows the class text", () => {
  it("V2 Bardo + V1 Guerreiro: text, icon and tooltip are Bardo, nothing of Guerreiro appears", () => {
    const { container } = render(<CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} v2={v2WithClass("Bardo")} />);

    const tooltip = hoverClassTooltip(container, "Bardo");
    expect(tooltip).toBe("Razão V2 de Bardo.");
    expect(tooltip).not.toContain(CLASS_DESCRIPTIONS.Guerreiro);
    expect(container.textContent).not.toContain(CLASS_DESCRIPTIONS.Guerreiro);
    expect(container.textContent).not.toContain("Guerreiro");
    expect(container.querySelector("svg")?.outerHTML).toBeTruthy();
    expect(container.innerHTML).toContain(
      render(<RpgClassIcon classNameType="Bardo" className="h-4 w-4 text-amber-300" />).container.querySelector("svg")!.outerHTML
    );
  });

  it("V2 tooltip is localized", () => {
    useUiStore.setState({ language: "en" });
    const { container } = render(<CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} v2={v2WithClass("Bardo")} />);

    expect(hoverClassTooltip(container, "Bard")).toBe("V2 reason for Bard.");
  });

  it("V2 without a usable reason: no tooltip at all, never the V1 description", () => {
    const { container } = render(
      <CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} v2={v2WithClass("Bardo", { pt: "  ", en: "" })} />
    );

    expect(hoverClassTooltip(container, "Bardo")).toBeNull();
    expect(container.textContent).not.toContain(CLASS_DESCRIPTIONS.Guerreiro);
  });

  it("V2 and V1 with the same class: the tooltip is the V2 reason, not the V1 description", () => {
    const { container } = render(<CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} v2={v2WithClass("Guerreiro")} />);

    const tooltip = hoverClassTooltip(container, "Guerreiro");
    expect(tooltip).toBe("Razão V2 de Guerreiro.");
    expect(tooltip).not.toBe(CLASS_DESCRIPTIONS.Guerreiro);
  });

  it("no V2: the V1 description keeps working", () => {
    const { container } = render(<CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} v2={null} />);

    expect(hoverClassTooltip(container, "Guerreiro")).toBe(CLASS_DESCRIPTIONS.Guerreiro);
  });

  it("V2 undefined behaves like no V2", () => {
    const { container } = render(<CharacterHeader character={v1Character("Mago")} equippedTitle={null} />);

    expect(hoverClassTooltip(container, "Mago")).toBe(CLASS_DESCRIPTIONS.Mago);
  });
});
