import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "@/stores/useUiStore";
import { buildDeveloperChronicle } from "./buildDeveloperChronicle";
import { ChronicleSection } from "./ChronicleSection";
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

const PARTIAL = buildDeveloperChronicle(
  yearlyProfile({
    createdAt: "2018-04-01T00:00:00Z",
    referenceDate: REF,
    omitYears: [2018, 2019, 2020],
    yearlyCoverage: "partial",
    years: { 2021: 100, 2022: 200, 2023: 300, 2024: 400, 2025: 500, 2026: 100 },
  })
);

const timeline = (name = "Linha do tempo da jornada") => screen.getByRole("list", { name });
const chapters = (name?: string) =>
  within(timeline(name))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
const toggle = (name: RegExp) => screen.getByRole("button", { name });

function setLanguage(language: "pt-BR" | "en") {
  act(() => useUiStore.setState({ language }));
}

describe("ChronicleSection", () => {
  beforeEach(() => setLanguage("pt-BR"));
  afterEach(cleanup);

  it("is a titled section of the sheet, named Crônica da Jornada, and explains where the story comes from", () => {
    render(<ChronicleSection chronicle={FULL} />);

    expect(screen.getByRole("heading", { level: 2, name: "Crônica da Jornada" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Crônica da Jornada" })).toBeInTheDocument();
    expect(screen.getByText("Sua história no GitHub, construída apenas com dados públicos reais.")).toBeInTheDocument();
    expect(screen.queryByText("Crônica do Desenvolvedor")).toBeNull();
  });

  it("summarises the journey with the real figures", () => {
    render(<ChronicleSection chronicle={FULL} />);

    const stats = within(screen.getByRole("list", { name: "Resumo da jornada" })).getAllByRole("listitem");
    expect(stats.map((item) => item.textContent)).toEqual([
      "7 anosTempo de jornada",
      "2025Ano mais ativo",
      "22 diasMaior sequência",
      "3.112Total de contribuições",
    ]);
  });

  it("previews at most 3 chapters: the start, one in between and the current chapter", () => {
    render(<ChronicleSection chronicle={FULL} />);

    const shown = chapters();
    expect(shown.length).toBeGreaterThanOrEqual(2);
    expect(shown.length).toBeLessThanOrEqual(3);
    expect(shown[0]).toBe("O Início da Jornada");
    expect(shown[shown.length - 1]).toBe("Capítulo Atual");
    expect(screen.getByText("Jonathan iniciou sua jornada no GitHub em 12 de mar. de 2019.")).toBeInTheDocument();
    // The rest of the journey is not rendered until asked for.
    expect(screen.queryByText("2020–2022")).toBeNull();
  });

  it("expands the whole timeline inline and collapses it back", () => {
    render(<ChronicleSection chronicle={FULL} />);
    const previewCount = chapters().length;

    const button = toggle(/Ver toda a Crônica/i);
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(toggle(/Recolher Crônica/i)).toHaveAttribute("aria-expanded", "true");
    expect(chapters()).toEqual([
      "O Início da Jornada",
      "O Ritmo Cresce",
      "O Ritmo Cresce",
      "O Grande Avanço",
      "Capítulo Atual",
    ]);
    expect(chapters().length).toBeGreaterThan(previewCount);
    expect(screen.getByText("2020–2022")).toBeInTheDocument();
    expect(screen.getByText("570 contribuições ao longo de 3 anos.")).toBeInTheDocument();

    fireEvent.click(toggle(/Recolher Crônica/i));
    expect(toggle(/Ver toda a Crônica/i)).toHaveAttribute("aria-expanded", "false");
    expect(chapters()).toHaveLength(previewCount);
    expect(screen.queryByText("2020–2022")).toBeNull();
  });

  it("wires the toggle to the region it controls and keeps it a native, focusable button", () => {
    render(<ChronicleSection chronicle={FULL} />);
    const button = toggle(/Ver toda a Crônica/i);

    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    const controlled = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(controlled).not.toBeNull();
    expect(controlled).toContainElement(timeline());

    fireEvent.click(button);
    expect(document.getElementById(button.getAttribute("aria-controls") ?? "")).toContainElement(timeline());
    button.focus();
    expect(button).toHaveFocus();
  });

  it("shows today's snapshot only in the expanded chronicle, and only with something to say", () => {
    const withSnapshot = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2019-03-12T00:00:00Z",
        referenceDate: REF,
        years: { 2019: 10 },
        overrides: { starsReceived: { value: 1200, coverage: "full" }, languages: [{ name: "Rust", bytes: 10, repoCount: 1 }] },
      })
    );
    render(<ChronicleSection chronicle={withSnapshot} />);
    expect(screen.queryByText("Retrato de hoje")).toBeNull();

    fireEvent.click(toggle(/Ver toda a Crônica/i));
    expect(screen.getByText("Retrato de hoje")).toBeInTheDocument();
    expect(screen.getByText("Atualmente, Rust é sua principal afinidade.")).toBeInTheDocument();
    expect(screen.getByText("Hoje, seus repositórios próprios somam 1.200 estrelas.")).toBeInTheDocument();
    cleanup();

    render(<ChronicleSection chronicle={FULL} />);
    fireEvent.click(toggle(/Ver toda a Crônica/i));
    expect(screen.queryByText("Retrato de hoje")).toBeNull();
  });

  it("marks a partial history as known / at least, and never turns an unread year into zero", () => {
    render(<ChronicleSection chronicle={PARTIAL} />);

    expect(screen.getByRole("note")).toHaveTextContent("Histórico conhecido");
    expect(screen.getByText("Contribuições registradas")).toBeInTheDocument();
    expect(screen.getByText("≥ 1.600")).toBeInTheDocument();
    expect(screen.getByText("Maior ano conhecido")).toBeInTheDocument();
    expect(screen.queryByText("Total de contribuições")).toBeNull();

    fireEvent.click(toggle(/Ver toda a Crônica/i));
    expect(screen.getByText("Histórico indisponível para este período.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b0 contribuições/);
  });

  it("says plainly when the history is unavailable and shows a minimal chronicle with no figure", () => {
    const none = buildDeveloperChronicle(noHistoryProfile("2019-03-12T00:00:00Z", REF));
    render(<ChronicleSection chronicle={none} />);

    expect(screen.getByRole("note")).toHaveTextContent("O histórico anual de contribuições não está disponível");
    expect(screen.getByText("O Início da Jornada")).toBeInTheDocument();
    expect(screen.getByText("Capítulo Atual")).toBeInTheDocument();
    expect(screen.getByText("Tempo de jornada")).toBeInTheDocument();
    expect(screen.queryByText("Total de contribuições")).toBeNull();
    expect(screen.queryByText(/\b0\b.*contribuições/)).toBeNull();
    expect(screen.queryByText("Ano mais ativo")).toBeNull();
    expect(screen.queryByText("Maior sequência")).toBeNull();
  });

  it("renders a brand-new account as a single chapter", () => {
    const fresh = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2026-09-20T00:00:00Z", referenceDate: REF, years: { 2026: 1 } })
    );
    render(<ChronicleSection chronicle={fresh} />);

    expect(chapters()).toEqual(["O Início da Jornada"]);
    expect(screen.getByText("menos de 1 mês")).toBeInTheDocument();
    expect(screen.queryByText("Ano mais ativo")).toBeNull();
  });

  it("switches language without any Portuguese left over", () => {
    setLanguage("en");
    render(<ChronicleSection chronicle={FULL} />);

    expect(screen.getByRole("heading", { level: 2, name: "Journey Chronicle" })).toBeInTheDocument();
    expect(screen.getByText("Your GitHub story, built only from real public data.")).toBeInTheDocument();
    expect(screen.getByText("The Journey Begins")).toBeInTheDocument();
    expect(screen.getByText("Jonathan began their journey on GitHub on Mar 12, 2019.")).toBeInTheDocument();
    expect(screen.getByText("The journey continues.")).toBeInTheDocument();
    expect(screen.getByText("7 years")).toBeInTheDocument();

    fireEvent.click(toggle(/View full chronicle/i));
    expect(toggle(/Collapse chronicle/i)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("570 contributions over 3 years.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Jornada|Crônica|contribuições|Capítulo|Recolher/);
  });

  it("never shows raw placeholders or 'undefined', collapsed or expanded", () => {
    render(<ChronicleSection chronicle={FULL} />);
    expect(document.body.textContent).not.toMatch(/undefined|NaN|\{\w+\}/);
    fireEvent.click(toggle(/Ver toda a Crônica/i));
    expect(document.body.textContent).not.toMatch(/undefined|NaN|\{\w+\}/);
  });

  it("has no emoji: icons come from the RPG set", () => {
    const { container } = render(<ChronicleSection chronicle={FULL} />);
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    // The timeline markers are kit images now (CSS), so the SVGs left are the summary and action icons.
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(4);
  });
});
