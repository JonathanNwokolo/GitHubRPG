import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { fetchCharacter } from "@/data/api/fetchCharacter";
import { createRPGCharacter } from "@/game/createCharacter";
import { getAvatarFrameForUsername } from "@/features/avatar";
import { useUiStore } from "@/stores/useUiStore";
import { makeAverageProfile, m } from "@/test/builders";
import { DuelArena } from "./DuelArena";

vi.mock("@/data/api/fetchCharacter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/api/fetchCharacter")>()),
  fetchCharacter: vi.fn(),
}));

const mockedFetchCharacter = vi.mocked(fetchCharacter);

describe("DuelArena avatars", () => {
  beforeEach(() => {
    useUiStore.setState({ language: "pt-BR", reducedMotion: "reduced" });
    mockedFetchCharacter.mockImplementation(async (username) =>
      createRPGCharacter(makeAverageProfile({
        username,
        // Hero B has no photo: it must still render, with initials.
        avatarUrl: username === "alpha" ? `https://avatars.example/${username}` : undefined,
      }))
    );
  });

  it("shows each fighter in the same frame the rest of the site gives them", async () => {
    const { container } = render(<DuelArena heroA="alpha" heroB="Beta" />);
    await screen.findAllByRole("heading", { level: 2 });
    await waitFor(() => expect(container.querySelectorAll("[data-avatar-frame]")).toHaveLength(2));

    const frames = [...container.querySelectorAll("[data-avatar-frame]")].map((el) => el.getAttribute("data-avatar-frame"));
    expect(frames).toEqual([getAvatarFrameForUsername("alpha").id, getAvatarFrameForUsername("Beta").id]);
  });

  it("falls back to initials when a fighter has no photo", async () => {
    render(<DuelArena heroA="alpha" heroB="beta" />);
    expect(await screen.findByText("BE")).toBeInTheDocument();
  });
});

describe("DuelArena calculation coverage", () => {
  beforeEach(() => {
    useUiStore.setState({ language: "pt-BR", reducedMotion: "reduced" });
    mockedFetchCharacter.mockImplementation(async (username) => createRPGCharacter(
      makeAverageProfile({ username, ...(username === "partial" ? { commits: m(0, "unavailable") } : {}) })
    ));
  });

  it("does not create rounds or a winner when either hero is partial", async () => {
    const { container } = render(<DuelArena heroA="partial" heroB="complete" />);
    expect(await screen.findByRole("heading", { name: "Duelo temporariamente indisponível" })).toBeInTheDocument();
    expect(screen.getByText(/contribuições de um dos heróis/)).toBeInTheDocument();
    expect(container.querySelectorAll("article[aria-label]")).toHaveLength(0);
  });
});

describe("DuelArena skip animation", { timeout: 30_000 }, () => {
  const RESULT = /venceu o duelo|Empate lendário/i;
  const SKIP = { name: "Pular animação" };
  // Each round card is framed (~32ms), enters (500ms), is read (3000ms) and transitions (500ms)
  // before the next one is released; the first one is rendered at 500ms.
  const ROUND_COUNT = 5;
  const ROUND_STEP_MS = 32 + 500 + 3_000 + 500;
  const LAST_REVEAL_MS = 500 + (ROUND_COUNT - 1) * ROUND_STEP_MS;
  const RESULT_MS = LAST_REVEAL_MS + ROUND_STEP_MS;

  // React batches state updates until an `act` scope ends, so time advances in small acts to keep
  // each state-driven step of the paced sequence close to real time.
  const advance = async (ms: number) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    for (let left = ms; left > 0; left -= 50) {
      await act(async () => { await vi.advanceTimersByTimeAsync(Math.min(50, left)); });
    }
  };
  const revealedRounds = (container: HTMLElement) => container.querySelectorAll("article[aria-label]").length;

  async function renderLiveDuel(heroA = "alpha", heroB = "beta") {
    const view = render(<DuelArena heroA={heroA} heroB={heroB} />);
    await advance(0);
    return view;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("scrollTo", vi.fn());
    useUiStore.setState({ language: "pt-BR", reducedMotion: "standard" });
    mockedFetchCharacter.mockImplementation(async (username) => createRPGCharacter(makeAverageProfile({ username })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reveals rounds on the normal schedule and offers the skip button until the end", async () => {
    const { container } = await renderLiveDuel();
    expect(revealedRounds(container)).toBe(0);
    expect(screen.getByRole("button", SKIP)).toBeInTheDocument();

    await advance(500);
    expect(revealedRounds(container)).toBe(1);
    // The first card stays alone for its whole reading window.
    await advance(3_500);
    expect(revealedRounds(container)).toBe(1);
    await advance(1_000);
    expect(revealedRounds(container)).toBe(2);
    expect(screen.queryByRole("heading", { name: RESULT })).not.toBeInTheDocument();

    await advance(LAST_REVEAL_MS + 400 - 5_000);
    expect(revealedRounds(container)).toBe(ROUND_COUNT);
    // The last round must also be read before the result replaces the flow.
    expect(screen.queryByRole("heading", { name: RESULT })).not.toBeInTheDocument();

    await advance(ROUND_STEP_MS + 400);
    expect(screen.getByRole("heading", { name: RESULT })).toBeInTheDocument();
    expect(screen.queryByRole("button", SKIP)).not.toBeInTheDocument();
  });

  it("shows the result immediately on skip and keeps it stable while old timers would have fired", async () => {
    const { container } = await renderLiveDuel();
    await advance(500);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    act(() => screen.getByRole("button", SKIP).click());
    expect(screen.getByRole("heading", { name: RESULT })).toBeInTheDocument();
    expect(revealedRounds(container)).toBe(ROUND_COUNT);
    expect(screen.queryByRole("button", SKIP)).not.toBeInTheDocument();

    // Step through every original reveal instant: the result must never disappear or shrink.
    for (let elapsed = 0; elapsed <= RESULT_MS + 2000; elapsed += 450) {
      await advance(450);
      expect(screen.getByRole("heading", { name: RESULT })).toBeInTheDocument();
      expect(revealedRounds(container)).toBe(ROUND_COUNT);
      expect(screen.queryByRole("button", SKIP)).not.toBeInTheDocument();
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels every pending timer when unmounted", async () => {
    const { unmount } = await renderLiveDuel();
    await advance(500);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    // A just-mounted card animation may still own one animation frame; it settles within a frame.
    // Any reading/pacing timer of ours would survive it.
    await vi.advanceTimersByTimeAsync(50);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not let a previous duel's timers reveal rounds of a new duel", async () => {
    const { container, rerender } = await renderLiveDuel("alpha", "beta");
    await advance(1000); // old duel: round 1 shown, rounds 2..5 still pending (first at 2300ms)

    rerender(<DuelArena heroA="gamma" heroB="delta" />);
    await advance(0);
    expect(revealedRounds(container)).toBe(0);
    expect(screen.queryByRole("heading", { name: RESULT })).not.toBeInTheDocument();

    // New duel started ~1000ms into the old schedule; at old t=2300 only the new round 1 may be visible.
    await advance(1300);
    expect(revealedRounds(container)).toBe(1);

    // And the new duel still follows its own schedule to the end.
    await advance(RESULT_MS + 400);
    expect(revealedRounds(container)).toBe(ROUND_COUNT);
    expect(screen.getByRole("heading", { name: RESULT })).toBeInTheDocument();
  });
});
