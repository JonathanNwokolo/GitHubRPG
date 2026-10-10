import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RpgClassIcon } from "@/design-system";
import { createRPGCharacter } from "@/game/createCharacter";
import type { ClassName } from "@/game/types";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { createCharacterPresentationModel, type RPGCharacterV2Public } from "@/game-v2/publicProjection";
import { useUiStore } from "@/stores/useUiStore";
import { CharacterHeader } from "./CharacterHeader";

beforeEach(() => useUiStore.setState({ language: "pt-BR" }));
afterEach(() => useUiStore.setState({ language: "pt-BR" }));

const fixture = GOLDEN_FIXTURES.architecturalSystem();
const baseV2 = createCharacterPresentationModel(true, { state: "ready", character: createRPGCharacterV2(fixture) }).v2 as RPGCharacterV2Public;

function v1Character(className: ClassName) {
  const character = createRPGCharacter(fixture.profile);
  character.archetype = { ...character.archetype, className };
  return character;
}

function v2WithClass(className: ClassName): RPGCharacterV2Public {
  return { ...baseV2, identity: { ...baseV2.identity, className } };
}

/** Markup of the icon the header drew next to the class name. */
function headerClassIcon(container: HTMLElement, className: string) {
  const label = Array.from(container.querySelectorAll("span")).find((el) => el.textContent === className);
  const icon = label?.parentElement?.querySelector("svg");
  expect(icon, `class icon next to "${className}"`).toBeTruthy();
  return icon!.outerHTML;
}

function expectedIcon(className: ClassName) {
  return render(<RpgClassIcon classNameType={className} className="h-4 w-4 text-amber-300" />).container.querySelector("svg")!.outerHTML;
}

describe("CharacterHeader class icon follows the class text", () => {
  it("V2 present: text and icon are both the V2 class, not the V1 one", () => {
    const { container } = render(<CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} v2={v2WithClass("Bardo")} />);

    expect(container.textContent).toContain("Bardo");
    expect(headerClassIcon(container, "Bardo")).toBe(expectedIcon("Bardo"));
    expect(headerClassIcon(container, "Bardo")).not.toBe(expectedIcon("Guerreiro"));
  });

  it("no V2: text and icon both fall back to V1", () => {
    const { container } = render(<CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} v2={null} />);

    expect(headerClassIcon(container, "Guerreiro")).toBe(expectedIcon("Guerreiro"));
    expect(headerClassIcon(container, "Guerreiro")).not.toBe(expectedIcon("Bardo"));
  });

  it("V2 undefined behaves like no V2", () => {
    const { container } = render(<CharacterHeader character={v1Character("Mago")} equippedTitle={null} />);

    expect(headerClassIcon(container, "Mago")).toBe(expectedIcon("Mago"));
  });

  it("localizes the V1 class label in English while preserving the canonical icon", () => {
    useUiStore.setState({ language: "en" });
    const { container } = render(<CharacterHeader character={v1Character("Guerreiro")} equippedTitle={null} />);

    expect(headerClassIcon(container, "Warrior")).toBe(expectedIcon("Guerreiro"));
    expect(container.textContent).not.toContain("Guerreiro");
  });
});
