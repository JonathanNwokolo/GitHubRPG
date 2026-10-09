import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

describe("DuelArena Creator Override UI Sequence", { timeout: 30_000 }, () => {
  // React batches state updates until an `act` scope ends, so time is advanced in small acts to
  // keep each state-driven step of the paced sequence as close to real time as possible.
  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    for (let left = ms; left > 0; left -= 50) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(Math.min(50, left));
      });
    }
  };

  // Schedule timeline (zero-sized jsdom rects, so framing only costs two animation frames ~32ms):
  // each card = 32ms frame + 500ms entry + 3000ms reading + 500ms transition = 4032ms
  // Rounds 1..5 appear at 500, 4532, 8564, 12596, 16628
  // Apparent Defeat: 20660ms (after round 5 has been read)
  // Anomaly: 21160ms, Summoning Circle: 21660ms, Card Entrance: 22860ms, Card Reveal: 24060ms
  // Effect Activation: ~27942ms (frame + flip + 3s reading)
  // Score Inversion: ~31474ms, Creator Ascension: ~35006ms
  // Card Dissolution: ~38538ms, Final Result: ~39038ms
  let clock = 0;
  const advanceTo = async (target: number) => {
    await advance(target - clock);
    clock = target;
  };
  // Steps until a condition holds and reports the (fake) time at which it first did.
  const reach = async (condition: () => boolean, limitMs = 60_000) => {
    const startedAt = Date.now();
    while (!condition()) {
      if (Date.now() - startedAt > limitMs) throw new Error("Condition was not reached in time");
      await advance(50);
    }
    return Date.now();
  };

  beforeEach(() => {
    clock = 0;
    vi.useFakeTimers();
    vi.stubGlobal("scrollTo", vi.fn());
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
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function renderOverrideDuel(heroA = "gvanrossum", heroB = "JonathanNwokolo") {
    const view = render(<DuelArena heroA={heroA} heroB={heroB} />);
    await advance(0);
    return view;
  }

  it("progresses sequentially through the cinematic sequence: apparent defeat, anomaly, summoning seal, card flip, effect, score inversion, and final official victory", async () => {
    const { container } = await renderOverrideDuel();

    const rounds = () => container.querySelectorAll("article[aria-label]").length;
    const hasText = (text: string) => () => screen.queryAllByText(text).length > 0;
    const t0 = Date.now();

    expect(rounds()).toBe(0);

    // Every round card gets its full entry + reading + transition window before the next is released.
    const roundAt: number[] = [];
    for (let count = 1; count <= 5; count += 1) {
      roundAt.push(await reach(() => rounds() >= count));
    }
    expect(roundAt[0] - t0).toBeLessThan(700);
    for (let index = 1; index < roundAt.length; index += 1) {
      const gap = roundAt[index] - roundAt[index - 1];
      expect(gap).toBeGreaterThanOrEqual(4_000);
      expect(gap).toBeLessThan(5_000);
    }

    // The last round is read too before the invocation starts.
    const defeatAt = await reach(hasText("O combate parecia decidido..."));
    expect(defeatAt - roundAt[4]).toBeGreaterThanOrEqual(4_000);
    expect(screen.queryByText("ANOMALIA DETECTADA")).not.toBeInTheDocument();

    // Approved invocation clock: anomaly, summoning circle, card entrance, flip.
    const anomalyAt = await reach(hasText("ANOMALIA DETECTADA"));
    expect(anomalyAt - defeatAt).toBeLessThan(700);
    expect(screen.getByText("AUTORIDADE ROOT DETECTADA")).toBeInTheDocument();
    const circleAt = await reach(hasText("INVOCAÇÃO ARCANO DA RAIZ"));
    expect(circleAt - anomalyAt).toBeLessThan(700);
    const revealAt = await reach(hasText("AUTORIDADE ABSOLUTA"));
    expect(revealAt - defeatAt).toBeLessThan(3_700);
    expect(screen.getAllByText("O CRIADOR").length).toBeGreaterThan(0);

    // The revealed card stays through the approved flip plus the full reading window.
    const effectAt = await reach(hasText("EFEITO ATIVADO: INVERSÃO ABSOLUTA"));
    expect(effectAt - revealAt).toBeGreaterThanOrEqual(3_850);
    expect(screen.getAllByText("Inverte o resultado do duelo.").length).toBeGreaterThan(0);

    const ascensionAt = await reach(hasText("AUTORIDADE DO CRIADOR ATIVADA"));
    expect(ascensionAt - effectAt).toBeGreaterThanOrEqual(7_000);
    expect(screen.getByText("“O Criador não pode ser derrotado em seu próprio domínio.”")).toBeInTheDocument();

    // Dissolution, then the persistent official final outcome
    expect(screen.queryByRole("heading", { name: "VITÓRIA — O CRIADOR" })).not.toBeInTheDocument();
    const finalAt = await reach(() => screen.queryByRole("heading", { name: "VITÓRIA — O CRIADOR" }) !== null);
    expect(finalAt - ascensionAt).toBeGreaterThanOrEqual(3_500);
    expect(screen.getByText("CREATOR OVERRIDE")).toBeInTheDocument();
    expect(screen.getByText("PLACAR OFICIAL")).toBeInTheDocument();
    expect(screen.getAllByText("VENCEDOR OFICIAL").length).toBeGreaterThan(0);
    expect(screen.getByText(/MOTIVO: CREATOR OVERRIDE/)).toBeInTheDocument();

    // Share was removed from the Creator Override screen; building another duel remains.
    expect(screen.queryByRole("button", { name: "Compartilhar duelo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar link" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Montar outro duelo" })).toBeInTheDocument();

    // Crucial rule: Final result must NEVER show original raw defeat or "Histórico dos rounds"
    expect(screen.queryByText(/Histórico dos Rounds/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/4 × 1/i)).not.toBeInTheDocument();
  });

  it("skip during anomaly phase jumps immediately to final Creator victory and stays stable", async () => {
    await renderOverrideDuel();

    // Advance to anomaly phase (t = 21160ms)
    await advance(21_300);
    expect(screen.getAllByText("ANOMALIA DETECTADA").length).toBeGreaterThan(0);

    // Click Skip Animation
    const skipBtn = screen.getByRole("button", { name: "Pular animação" });
    act(() => skipBtn.click());

    // Result is immediately visible
    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pular animação" })).not.toBeInTheDocument();
    expect(screen.getByText("PLACAR OFICIAL")).toBeInTheDocument();
    expect(screen.queryByText(/Histórico dos Rounds/i)).not.toBeInTheDocument();

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
    expect(screen.getByText("PLACAR OFICIAL")).toBeInTheDocument();
    expect(screen.queryByText(/Histórico dos Rounds/i)).not.toBeInTheDocument();
  });

  it("works with reduced motion: immediately renders final Creator Override victory without motion triggers", async () => {
    useUiStore.setState({ language: "pt-BR", reducedMotion: "reduced" });
    await renderOverrideDuel();

    // In reduced motion, rounds and final result are immediately visible without timers
    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.getByText("CREATOR OVERRIDE")).toBeInTheDocument();
    expect(screen.getByText("PLACAR OFICIAL")).toBeInTheDocument();
    expect(screen.getByText("“O Criador não pode ser derrotado em seu próprio domínio.”")).toBeInTheDocument();
    expect(screen.queryByText(/Histórico dos Rounds/i)).not.toBeInTheDocument();
  });

  it("renders correctly in English (i18n)", async () => {
    useUiStore.setState({ language: "en", reducedMotion: "reduced" });
    await renderOverrideDuel();

    expect(screen.getByRole("heading", { name: "VICTORY — THE CREATOR" })).toBeInTheDocument();
    expect(screen.getByText("ROOT AUTHORITY")).toBeInTheDocument();
    expect(screen.getByText("OFFICIAL SCORE")).toBeInTheDocument();
    expect(screen.getAllByText("OFFICIAL WINNER").length).toBeGreaterThan(0);
    expect(screen.getByText("“The Creator cannot be defeated within their own domain.”")).toBeInTheDocument();
    expect(screen.queryByText(/Round History/i)).not.toBeInTheDocument();
    expect(screen.getByText(/REASON: CREATOR OVERRIDE/)).toBeInTheDocument();
  });

  it("supports Creator as Hero B (side B)", async () => {
    useUiStore.setState({ language: "pt-BR", reducedMotion: "reduced" });
    await renderOverrideDuel("gvanrossum", "JonathanNwokolo");

    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    expect(screen.getByText("PLACAR OFICIAL")).toBeInTheDocument();
    expect(screen.queryByText(/Histórico dos Rounds/i)).not.toBeInTheDocument();
  });

  function mockCardRects() {
    return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ x: 0, y: 900, top: 900, bottom: 1_200, left: 0, right: 600, width: 600, height: 300, toJSON: () => ({}) }) as DOMRect
    );
  }

  it("starts the reading window only after the follow scroll has settled", async () => {
    const rects = mockCardRects();
    const { container } = await renderOverrideDuel();
    const scrollTo = vi.mocked(window.scrollTo);
    const rounds = () => container.querySelectorAll("article[aria-label]").length;

    await reach(() => rounds() >= 1);
    await advance(100);
    expect(scrollTo).toHaveBeenCalledTimes(1);

    // Scroll is still in flight: reading cannot have started, so nothing is released.
    await advance(400);
    expect(rounds()).toBe(1);

    // scrollend lets entry (500) + reading (3000) + transition (500) start from that instant.
    const scrollEndedAt = Date.now();
    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });
    await advance(3_900);
    expect(rounds()).toBe(1);
    const secondAt = await reach(() => rounds() >= 2);
    expect(secondAt - scrollEndedAt).toBeGreaterThanOrEqual(4_000);
    expect(secondAt - scrollEndedAt).toBeLessThan(4_200);
    rects.mockRestore();
  });

  it("suspends auto-follow on manual wheel intent without breaking the sequence, and resumes on request", async () => {
    const rects = mockCardRects();
    const { container } = await renderOverrideDuel();
    const scrollTo = vi.mocked(window.scrollTo);
    const rounds = () => container.querySelectorAll("article[aria-label]").length;

    await advanceTo(700);
    expect(scrollTo).toHaveBeenCalled();

    act(() => fireEvent.wheel(window));
    expect(screen.getByRole("button", { name: "Acompanhar duelo" })).toHaveAttribute("aria-pressed", "false");

    // Round 2 is still released on schedule (scroll fallback 900ms was already pending), but never scrolled to.
    scrollTo.mockClear();
    await advanceTo(6_000);
    expect(rounds()).toBe(2);
    expect(scrollTo).not.toHaveBeenCalled();

    act(() => screen.getByRole("button", { name: "Acompanhar duelo" }).click());
    await advanceTo(6_040);
    expect(screen.getByRole("button", { name: "Acompanhando duelo" })).toHaveAttribute("aria-pressed", "true");
    expect(scrollTo).toHaveBeenCalledTimes(1);
    rects.mockRestore();
  });

  it("continues the paced sequence without overlapping timers after manual intervention", async () => {
    const { unmount } = await renderOverrideDuel();
    await advance(25_000);
    expect(screen.getAllByText("O CRIADOR").length).toBeGreaterThan(0);

    act(() => fireEvent.wheel(window));
    expect(screen.getByRole("button", { name: "Acompanhar duelo" })).toHaveAttribute("aria-pressed", "false");

    for (let step = 0; step < 5; step += 1) {
      await advance(5_000);
    }

    expect(screen.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
