import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { fetchHeroes } from "@/data/api/fetchHeroes";
import { useUiStore } from "@/stores/useUiStore";
import type { HeroSummary, HeroesResponse } from "./heroSummary";
import { HeroesHall } from "./HeroesHall";
import { AUTO_RETRY_DELAYS_MS } from "./useHeroCategory";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/data/api/fetchHeroes", () => ({ fetchHeroes: vi.fn() }));

const mockedFetchHeroes = vi.mocked(fetchHeroes);
const heroes: HeroSummary[] = ["alpha", "beta", "gamma", "delta", "epsilon"].map((username, index) => ({
  username,
  displayName: `Hero ${username}`,
  avatarUrl: `https://avatars.example/${username}`,
  level: 10 + index,
  className: index === 0 ? "Mago" : "Guerreiro",
  subclassName: index === 0 ? "Bardo" : undefined,
  dominantLanguage: index === 0 ? "TypeScript" : "Rust",
  title: index === 0 ? "Arcano" : undefined,
  starsReceived: 20 + index,
}));

function response(category: HeroesResponse["category"] = "legends", nextHeroes = heroes, failed = 0, pending = 0): HeroesResponse {
  return { category, heroes: nextHeroes, requested: 5, failed, pending, partial: failed + pending > 0 };
}

describe("HeroesHall", () => {
  beforeEach(() => {
    push.mockReset();
    mockedFetchHeroes.mockReset();
    mockedFetchHeroes.mockResolvedValue(response());
    useUiStore.setState({ language: "pt-BR" });
  });

  it("loads the first category and renders one featured hero plus four linked heroes", async () => {
    render(<HeroesHall />);
    expect(screen.getByRole("status")).toHaveTextContent("Abrindo os portões do salão");
    await screen.findByRole("heading", { name: "Hero alpha" });

    expect(mockedFetchHeroes).toHaveBeenCalledWith("legends", expect.any(AbortSignal));
    expect(screen.getByText("Herói em destaque")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Hero alpha/ })).toHaveAttribute("href", "/alpha");
  });

  it("switches categories by click and keyboard, then reuses the session cache", async () => {
    mockedFetchHeroes.mockImplementation(async (category) => response(category));
    render(<HeroesHall />);
    await screen.findByRole("heading", { name: "Hero alpha" });

    fireEvent.click(screen.getByRole("tab", { name: "Heróis do Brasil" }));
    await waitFor(() => expect(mockedFetchHeroes).toHaveBeenCalledWith("brazil", expect.any(AbortSignal)));
    expect(screen.getByRole("tab", { name: "Heróis do Brasil" })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Heróis do Brasil" }), { key: "ArrowRight" });
    await waitFor(() => expect(mockedFetchHeroes).toHaveBeenCalledWith("web", expect.any(AbortSignal)));
    expect(screen.getByRole("tab", { name: "Forjadores da Web" })).toHaveFocus();

    fireEvent.click(screen.getByRole("tab", { name: "Lendas do Código" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Lendas do Código" })).toHaveAttribute("aria-selected", "true"));
    expect(mockedFetchHeroes).toHaveBeenCalledTimes(3);
  });

  it("navigates Discover hero to a deterministic curated profile", async () => {
    render(<HeroesHall />);
    await screen.findByRole("heading", { name: "Hero alpha" });
    fireEvent.click(screen.getByRole("button", { name: /Descobrir um herói/i }));
    expect(push).toHaveBeenCalledWith("/beta");
  });

  it("shows partial failure and empty-category states without exposing errors", async () => {
    mockedFetchHeroes.mockResolvedValueOnce(response("legends", heroes.slice(0, 4), 1));
    const { unmount } = render(<HeroesHall />);
    expect(await screen.findByText("Alguns aventureiros estão em jornada e não puderam chegar ao salão.")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(4);
    unmount();

    mockedFetchHeroes.mockResolvedValueOnce(response("legends", [], 5));
    render(<HeroesHall />);
    expect(await screen.findByText("Nenhum aventureiro desta ala está disponível agora.")).toBeInTheDocument();
  });

  it("shows the heroes that arrived in time, says the rest is coming, and asks again on retry", async () => {
    mockedFetchHeroes
      .mockResolvedValueOnce(response("legends", heroes.slice(0, 3), 0, 2))
      .mockResolvedValueOnce(response());
    render(<HeroesHall />);

    expect(await screen.findByText(/Alguns heróis ainda estão chegando ao salão/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(5));
    expect(screen.queryByText(/ainda estão chegando/)).not.toBeInTheDocument();
    expect(mockedFetchHeroes).toHaveBeenCalledTimes(2);
  });

  it("does not remember a partial category: coming back asks the server again", async () => {
    mockedFetchHeroes.mockImplementation(async (category) =>
      category === "legends" ? response(category, heroes.slice(0, 2), 0, 3) : response(category)
    );
    render(<HeroesHall />);
    await screen.findByText(/ainda estão chegando/);

    fireEvent.click(screen.getByRole("tab", { name: "Heróis do Brasil" }));
    await waitFor(() => expect(mockedFetchHeroes).toHaveBeenCalledWith("brazil", expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole("tab", { name: "Lendas do Código" }));
    await waitFor(() => expect(mockedFetchHeroes).toHaveBeenCalledTimes(3));
  });

  it("offers a retry, not the empty state, when no hero arrived in time", async () => {
    mockedFetchHeroes.mockResolvedValueOnce(response("legends", [], 0, 5)).mockResolvedValueOnce(response());
    render(<HeroesHall />);

    expect(await screen.findByText("Alguns heróis ainda estão chegando ao salão.")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum aventureiro/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("heading", { name: "Hero alpha" });
  });

  it("fills the hall by itself while heroes arrive: message, then 2 cards, then 5, without the skeleton", async () => {
    vi.useFakeTimers();
    try {
      mockedFetchHeroes
        .mockResolvedValueOnce(response("legends", [], 0, 5))
        .mockResolvedValueOnce(response("legends", heroes.slice(0, 2), 0, 3))
        .mockResolvedValueOnce(response());
      render(<HeroesHall />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText("Alguns heróis ainda estão chegando ao salão.")).toBeInTheDocument();
      expect(screen.getByText("Atualizando automaticamente…")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(/Nenhum aventureiro/)).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTO_RETRY_DELAYS_MS[0]);
      });
      expect(screen.getAllByRole("link")).toHaveLength(2);
      expect(screen.getByText(/ainda estão chegando/)).toBeInTheDocument();
      expect(document.querySelector(".animate-pulse")).toBeNull();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(AUTO_RETRY_DELAYS_MS[1]);
      });
      expect(screen.getAllByRole("link")).toHaveLength(5);
      expect(screen.queryByText(/ainda estão chegando/)).not.toBeInTheDocument();
      expect(mockedFetchHeroes).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("says in English that some heroes are still arriving", async () => {
    useUiStore.setState({ language: "en" });
    mockedFetchHeroes.mockResolvedValueOnce(response("legends", heroes.slice(0, 4), 0, 1));
    render(<HeroesHall />);
    expect(await screen.findByText(/Some heroes are still arriving at the hall/)).toBeInTheDocument();
  });

  it("shows a friendly error and retries the aggregate request", async () => {
    mockedFetchHeroes.mockRejectedValueOnce(new Error("raw internal detail")).mockResolvedValueOnce(response());
    render(<HeroesHall />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Os portões do salão não responderam");
    expect(screen.queryByText("raw internal detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("heading", { name: "Hero alpha" });
    expect(mockedFetchHeroes).toHaveBeenCalledTimes(2);
  });

  it("renders every new label in English", async () => {
    useUiStore.setState({ language: "en" });
    render(<HeroesHall />);
    expect(screen.getByRole("heading", { name: "Hall of Heroes" })).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Hero alpha" });
    expect(screen.getByRole("tab", { name: "Heroes of Brazil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Discover a hero/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hero alpha/ })).toHaveTextContent("View sheet");
  });
});
