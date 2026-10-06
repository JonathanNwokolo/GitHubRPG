import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "@/stores/useUiStore";
import { buildDeveloperChronicle } from "./buildDeveloperChronicle";
import { ChroniclePanel } from "./ChroniclePanel";
import { noHistoryProfile, yearlyProfile } from "./testing/fixtures";

const REF = "2026-10-01T00:00:00Z";

const FULL = buildDeveloperChronicle(
  yearlyProfile({
    createdAt: "2019-03-12T00:00:00Z",
    referenceDate: REF,
    years: {
      2019: 40,
      2020: 180,
      2021: 200,
      2022: 190,
      2023: 342,
      2024: 610,
      2025: 1300,
      2026: { contributions: 250, commits: 187, pullRequests: 1, reviews: 1, issues: 0, activeDays: 62 },
    },
    longestStreak: { start: "2023-12-20", end: "2024-01-10", days: 22 },
    overrides: { displayName: "Jonathan Nwokolo" },
  })
);

/** A metric chip is "<value> <label>" in two spans: match its full text. */
const chip = (text: string) => screen.getByText((_, element) => element?.tagName === "LI" && element.textContent === text);

function setLanguage(language: "pt-BR" | "en") {
  act(() => useUiStore.setState({ language }));
}

describe("ChroniclePanel", () => {
  beforeEach(() => setLanguage("pt-BR"));
  afterEach(cleanup);

  it("tells the journey in order: it begins at the creation date and ends in the current chapter", () => {
    render(<ChroniclePanel chronicle={FULL} />);

    expect(screen.getByRole("heading", { level: 2, name: "Crônica do Desenvolvedor" })).toBeInTheDocument();
    const timeline = screen.getByRole("list", { name: "Linha do tempo da jornada" });
    const chapters = within(timeline)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(chapters).toEqual([
      "O Início da Jornada",
      "O Ritmo Cresce",
      "O Ritmo Cresce",
      "O Grande Avanço",
      "Capítulo Atual",
    ]);
    expect(screen.getByText("Jonathan iniciou sua jornada no GitHub em 12 de mar. de 2019.")).toBeInTheDocument();
    expect(screen.getByText("A jornada continua.")).toBeInTheDocument();
  });

  it("shows the year, real figures with correct plurals, and the summary", () => {
    render(<ChroniclePanel chronicle={FULL} />);

    expect(screen.getAllByText("2025").length).toBeGreaterThan(0);
    expect(chip("1.300 contribuições")).toBeInTheDocument();
    expect(chip("1 pull request")).toBeInTheDocument();
    expect(chip("1 review")).toBeInTheDocument();
    expect(chip("187 commits")).toBeInTheDocument();
    expect(screen.getByText("7 anos")).toBeInTheDocument();
    expect(screen.getByText("22 dias")).toBeInTheDocument();
    expect(screen.getByText("Tempo de jornada")).toBeInTheDocument();
    expect(screen.getByText("Maior sequência")).toBeInTheDocument();
  });

  it("collapses uneventful years into one line", () => {
    render(<ChroniclePanel chronicle={FULL} />);
    expect(screen.getByText("2020–2022")).toBeInTheDocument();
    expect(screen.getByText("570 contribuições ao longo de 3 anos.")).toBeInTheDocument();
    expect(screen.queryByText("2021")).toBeNull();
  });

  it("switches language without any Portuguese left over", () => {
    setLanguage("en");
    render(<ChroniclePanel chronicle={FULL} />);

    expect(screen.getByRole("heading", { level: 2, name: "Developer Chronicle" })).toBeInTheDocument();
    expect(screen.getByText("The Journey Begins")).toBeInTheDocument();
    expect(screen.getByText("Jonathan began their journey on GitHub on Mar 12, 2019.")).toBeInTheDocument();
    expect(screen.getByText("The journey continues.")).toBeInTheDocument();
    expect(screen.getByText("7 years")).toBeInTheDocument();
    expect(chip("1,300 contributions")).toBeInTheDocument();
    expect(screen.getByText("570 contributions over 3 years.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Jornada|Crônica|contribuições|Capítulo/);
  });

  it("says plainly when the history is unavailable and shows no figure", () => {
    const none = buildDeveloperChronicle(noHistoryProfile("2019-03-12T00:00:00Z", REF));
    render(<ChroniclePanel chronicle={none} />);

    expect(screen.getByRole("note")).toHaveTextContent("O histórico anual de contribuições não está disponível");
    expect(screen.getByText("O Início da Jornada")).toBeInTheDocument();
    expect(screen.getByText("Capítulo Atual")).toBeInTheDocument();
    expect(screen.queryByText("Total de contribuições")).toBeNull();
    expect(screen.queryByText(/\b0\b.*contribuições/)).toBeNull();
    expect(screen.queryByText("Ano mais ativo")).toBeNull();
  });

  it("marks a partial history as known / at least", () => {
    const partial = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2018-04-01T00:00:00Z",
        referenceDate: REF,
        omitYears: [2018, 2019, 2020],
        yearlyCoverage: "partial",
        years: { 2021: 100, 2022: 200, 2023: 300, 2024: 400, 2025: 500, 2026: 100 },
      })
    );
    render(<ChroniclePanel chronicle={partial} />);

    expect(screen.getByRole("note")).toHaveTextContent("Histórico conhecido");
    expect(screen.getByText("Contribuições registradas")).toBeInTheDocument();
    expect(screen.getByText("≥ 1.600")).toBeInTheDocument();
    expect(screen.getByText("Maior ano conhecido")).toBeInTheDocument();
    expect(screen.getByText("Histórico indisponível para este período.")).toBeInTheDocument();
  });

  it("renders a brand-new account as a single chapter", () => {
    const fresh = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2026-09-20T00:00:00Z", referenceDate: REF, years: { 2026: 1 } })
    );
    render(<ChroniclePanel chronicle={fresh} />);

    const timeline = screen.getByRole("list", { name: "Linha do tempo da jornada" });
    expect(within(timeline).getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(screen.getByText("O Início da Jornada")).toBeInTheDocument();
    expect(screen.getByText("Capítulo atual")).toBeInTheDocument();
    expect(chip("1 contribuição")).toBeInTheDocument();
    expect(screen.getByText("menos de 1 mês")).toBeInTheDocument();
  });

  it("shows today's snapshot apart from the history, only with something to say", () => {
    const withSnapshot = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2019-03-12T00:00:00Z",
        referenceDate: REF,
        years: { 2019: 10 },
        overrides: { starsReceived: { value: 1200, coverage: "full" }, languages: [{ name: "Rust", bytes: 10, repoCount: 1 }] },
      })
    );
    render(<ChroniclePanel chronicle={withSnapshot} />);
    expect(screen.getByText("Retrato de hoje")).toBeInTheDocument();
    expect(screen.getByText("Atualmente, Rust é sua principal afinidade.")).toBeInTheDocument();
    expect(screen.getByText("Hoje, seus repositórios próprios somam 1.200 estrelas.")).toBeInTheDocument();
    cleanup();

    render(<ChroniclePanel chronicle={FULL} />);
    expect(screen.queryByText("Retrato de hoje")).toBeNull();
  });

  it("never shows raw placeholders or 'undefined'", () => {
    render(<ChroniclePanel chronicle={FULL} />);
    expect(document.body.textContent).not.toMatch(/undefined|NaN|\{\w+\}/);
  });

  it("has no emoji: icons come from the RPG set", () => {
    const { container } = render(<ChroniclePanel chronicle={FULL} />);
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(5);
  });
});
