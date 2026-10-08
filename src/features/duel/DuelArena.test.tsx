import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { fetchCharacter } from "@/data/api/fetchCharacter";
import { createRPGCharacter } from "@/game/createCharacter";
import { getAvatarFrameForUsername } from "@/features/avatar";
import { useUiStore } from "@/stores/useUiStore";
import { makeAverageProfile } from "@/test/builders";
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

describe("DuelArena skip animation", () => {
  const RESULT = /venceu o duelo|Empate lendário/i;
  const SKIP = { name: "Pular animação" };
  // Rounds are revealed at 500 + index * 1800 ms.
  const ROUND_COUNT = 5;
  const LAST_REVEAL_MS = 500 + (ROUND_COUNT - 1) * 1800;

  const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  const revealedRounds = (container: HTMLElement) => container.querySelectorAll("article[aria-label]").length;

  async function renderLiveDuel(heroA = "alpha", heroB = "beta") {
    const view = render(<DuelArena heroA={heroA} heroB={heroB} />);
    await advance(0);
    return view;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    useUiStore.setState({ language: "pt-BR", reducedMotion: "standard" });
    mockedFetchCharacter.mockImplementation(async (username) => createRPGCharacter(makeAverageProfile({ username })));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals rounds on the normal schedule and offers the skip button until the end", async () => {
    const { container } = await renderLiveDuel();
    expect(revealedRounds(container)).toBe(0);
    expect(screen.getByRole("button", SKIP)).toBeInTheDocument();

    await advance(500);
    expect(revealedRounds(container)).toBe(1);
    await advance(1800);
    expect(revealedRounds(container)).toBe(2);
    expect(screen.queryByRole("heading", { name: RESULT })).not.toBeInTheDocument();

    await advance(LAST_REVEAL_MS);
    expect(revealedRounds(container)).toBe(ROUND_COUNT);
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
    for (let elapsed = 0; elapsed <= LAST_REVEAL_MS + 2000; elapsed += 450) {
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
    await advance(LAST_REVEAL_MS);
    expect(revealedRounds(container)).toBe(ROUND_COUNT);
    expect(screen.getByRole("heading", { name: RESULT })).toBeInTheDocument();
  });
});
