import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CharacterForgeLoading, CHARACTER_FORGE_MESSAGE_TIMES_MS, characterForgeMessageIndex } from "./CharacterForgeLoading";

describe("CharacterForgeLoading", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("changes its honest status copy at the requested time thresholds", () => {
    render(<CharacterForgeLoading language="pt-BR" />);
    const message = () => screen.getByTestId("forge-message").textContent;

    expect(message()).toBe("Invocando sua ficha...");
    act(() => vi.advanceTimersByTime(4_000));
    expect(message()).toBe("Lendo os registros da sua jornada...");
    act(() => vi.advanceTimersByTime(6_000));
    expect(message()).toBe("Forjando classe, atributos e afinidades...");
    act(() => vi.advanceTimersByTime(10_000));
    expect(message()).toBe("Explorando seus repositórios mais profundos...");
    act(() => vi.advanceTimersByTime(15_000));
    expect(message()).toBe("Sua jornada é extensa. Ainda estamos investigando...");
    act(() => vi.advanceTimersByTime(15_000));
    expect(message()).toBe("Algumas lendas levam mais tempo para serem forjadas.");
  });

  it("never presents a fabricated percentage and retains reduced-motion fallbacks", () => {
    const { container } = render(<CharacterForgeLoading language="pt-BR" />);
    expect(container.textContent).not.toMatch(/\d+\s*%/);
    expect(container.querySelectorAll(".motion-reduce\\:animate-none").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("keeps every threshold deterministic", () => {
    expect(CHARACTER_FORGE_MESSAGE_TIMES_MS.map(characterForgeMessageIndex)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
