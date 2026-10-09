import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { fetchCharacter } from "@/data/api/fetchCharacter";
import { createRPGCharacter } from "@/game/createCharacter";
import { useUiStore } from "@/stores/useUiStore";
import { languagesFromShares, makeMaxedProfile, makeProfile, m } from "@/test/builders";
import { DuelArena } from "./DuelArena";

vi.mock("@/data/api/fetchCharacter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/api/fetchCharacter")>()),
  fetchCharacter: vi.fn(),
}));

const mockedFetchCharacter = vi.mocked(fetchCharacter);

describe("DuelArena Creator Override UI Sequence", () => {
  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  // Schedule timeline:
  // Round 1: 500ms
  // Round 2: 2300ms
  // Round 3: 4100ms
  // Round 4: 5900ms
  // Round 5: 7700ms
  // Apparent Defeat: 8500ms (7700 + 800)
  // Anomaly: 10500ms (8500 + 2000)
  // Authority: 12900ms (10500 + 2400)
  // Restoration: 15700ms (12900 + 2800)
  // Final Result: 17300ms (15700 + 1600)

  beforeEach(() => {
    vi.useFakeTimers();
    useUiStore.setState({ language: "pt-BR", reducedMotion: "standard" });
    mockedFetchCharacter.mockImplementation(async (username) => {
      if (username.toLowerCase() === "jonathannwokolo") {
        const creator = createRPGCharacter(makeProfile({ username }));
        return {
          ...creator,
          stats: { ...creator.stats, reputation: 50 },
          summary: { ...creator.summary, starsReceived: m(100), followers: m(100) },
        };
      }
      const opponent = createRPGCharacter({
        ...makeMaxedProfile(),
        username,
        languages: languagesFromShares({ TypeScript: 80, Rust: 20 }, 20),
      });
      return {
        ...opponent,
        stats: { ...opponent.stats, reputation: 0 },
        summary: { ...opponent.summary, starsReceived: m(0), followers: m(0) },
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderOverrideDuel(heroA = "gvanrossum", heroB = "JonathanNwokolo") {
    const view = render(<DuelArena heroA={heroA} heroB={heroB} />);
    await advance(0);
    return view;
  }

  it("progresses sequentially through all dramatic phases: apparent defeat, anomaly, authority, restoration, and final victory", async () => {
    const { container } = await renderOverrideDuel();

    // At start: no rounds revealed yet
    expect(container.querySelectorAll("article[aria-label]").length).toBe(0);

    // After round 5 finishes (7700ms)
    await advance(7700);
    expect(container.querySelectorAll("article[aria-label]").length).toBe(5);

    // Phase 1: Apparent Defeat (t = 8500ms)
    await advance(900);
    expect(screen.getByText("O combate parecia decidido...")).toBeInTheDocument();
    expect(screen.queryByText("ANOMALIA DETECTADA")).not.toBeInTheDocument();

    // Phase 2: Anomaly Detected (t = 10500ms)
    await advance(2000);
    expect(screen.getAllByText("ANOMALIA DETECTADA").length).toBeGreaterThan(0);
    expect(screen.getByText("Instabilidade dimensional detectada no tecido da arena.")).toBeInTheDocument();

    // Phase 3: Authority of the Creator (t = 12900ms)
    await advance(2400);
    expect(screen.getByText("AUTORIDADE DO CRIADOR ATIVADA")).toBeInTheDocument();
    expect(screen.getByText("“O Criador não pode ser derrotado em seu próprio domínio.”")).toBeInTheDocument();

    // Phase 4: Restoration of vitality (t = 15700ms)
    await advance(2800);
    expect(screen.getByText("RESTAURAÇÃO DA ESSÊNCIA VITAL")).toBeInTheDocument();

    // Phase 5: Official Creator Override Result (t = 17300ms)
    await advance(1600);
    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.getByText("CREATOR OVERRIDE")).toBeInTheDocument();
    expect(screen.getByText("AUTORIDADE ROOT")).toBeInTheDocument();
    expect(screen.getByText(/MOTIVO: CREATOR OVERRIDE/)).toBeInTheDocument();

    // Honest round history: Guido remains the apparent 4x1 winner.
    expect(screen.getByText("Histórico dos Rounds: 4 × 1")).toBeInTheDocument();
  });

  it("skip during anomaly phase jumps immediately to final Creator victory and stays stable", async () => {
    await renderOverrideDuel();

    // Advance to anomaly phase (t = 10500ms)
    await advance(10600);
    expect(screen.getAllByText("ANOMALIA DETECTADA").length).toBeGreaterThan(0);

    // Click Skip Animation
    const skipBtn = screen.getByRole("button", { name: "Pular animação" });
    act(() => skipBtn.click());

    // Result is immediately visible
    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pular animação" })).not.toBeInTheDocument();

    // Old timers must not revert or break the result
    for (let t = 0; t <= 10000; t += 1000) {
      await advance(1000);
      expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    }
  });

  it("skip during initial rounds jumps immediately to the final Creator Override result", async () => {
    await renderOverrideDuel();

    await advance(1000); // During round 1
    const skipBtn = screen.getByRole("button", { name: "Pular animação" });
    act(() => skipBtn.click());

    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.getByText("Histórico dos Rounds: 4 × 1")).toBeInTheDocument();
  });

  it("works with reduced motion: immediately renders final Creator Override victory without motion triggers", async () => {
    useUiStore.setState({ language: "pt-BR", reducedMotion: "reduced" });
    await renderOverrideDuel();

    // In reduced motion, rounds and final result are immediately visible without timers
    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.getByText("CREATOR OVERRIDE")).toBeInTheDocument();
    expect(screen.getByText("“O Criador não pode ser derrotado em seu próprio domínio.”")).toBeInTheDocument();
  });

  it("renders correctly in English (i18n)", async () => {
    useUiStore.setState({ language: "en", reducedMotion: "reduced" });
    await renderOverrideDuel();

    expect(screen.getByRole("heading", { name: "VICTORY — THE CREATOR" })).toBeInTheDocument();
    expect(screen.getByText("ROOT AUTHORITY")).toBeInTheDocument();
    expect(screen.getByText("“The Creator cannot be defeated within their own domain.”")).toBeInTheDocument();
    expect(screen.getByText("Round History: 4 × 1")).toBeInTheDocument();
    expect(screen.getByText(/REASON: CREATOR OVERRIDE/)).toBeInTheDocument();
  });

  it("supports Creator as Hero B (side B)", async () => {
    useUiStore.setState({ language: "pt-BR", reducedMotion: "reduced" });
    await renderOverrideDuel("gvanrossum", "JonathanNwokolo");

    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.getByText("Histórico dos Rounds: 4 × 1")).toBeInTheDocument();
  });
});
