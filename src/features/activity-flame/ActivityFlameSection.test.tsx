import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/useUiStore";
import { ActivityFlameSection } from "./ActivityFlameSection";
import { buildActivityFlame } from "./buildActivityFlame";
import { CREATED_LONG_AGO, REFERENCE, calendarOf, dayCounts, flatYear, sparseYear } from "./testing/fixtures";

const build = (calendar: Parameters<typeof buildActivityFlame>[0]["calendar"], createdAt = CREATED_LONG_AGO) =>
  buildActivityFlame({ calendar, createdAt, referenceDate: REFERENCE });

/** 2024: a quiet year. 2025: Saturdays only, well above 2024. 2026 (in progress): a legendary March 15th and a 4-day streak. */
const MULTI = build(
  calendarOf({
    2024: dayCounts(2024, null, (_, __, i) => (i % 9 === 0 ? 1 : 0)),
    2025: dayCounts(2025, null, (_, dow) => (dow === 6 ? 3 : 0)),
    2026: sparseYear(
      2026,
      {
        "2026-02-02": 1, "2026-02-03": 2, "2026-02-04": 1, "2026-02-05": 3,
        "2026-03-15": 34,
        "2026-04-02": 2, "2026-05-20": 1, "2026-08-11": 4, "2026-09-30": 1,
      },
      "2026-10-09"
    ),
  })
);

const EMPTY_UNAVAILABLE = build({ years: [], coverage: "unavailable" });
const EMPTY_DORMANT = build(calendarOf({ 2025: flatYear(2025, 0), 2026: flatYear(2026, 0, "2026-10-09") }));

function setLanguage(language: "pt-BR" | "en") {
  act(() => useUiStore.setState({ language }));
}

const tabs = () => within(screen.getByRole("radiogroup")).getAllByRole("radio");
const selectedTab = () => screen.getByRole("radio", { checked: true });

describe("ActivityFlameSection", () => {
  beforeEach(() => setLanguage("pt-BR"));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("is a titled section with the subtitle, a year per read year and the newest year selected", () => {
    render(<ActivityFlameSection model={MULTI} />);

    expect(screen.getByRole("region", { name: "Chama da Atividade" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Chama da Atividade" })).toBeInTheDocument();
    expect(screen.getByText("A energia que moldou esta lenda.")).toBeInTheDocument();
    expect(tabs().map((tab) => tab.textContent)).toEqual(["2024", "2025", "2026"]);
    expect(selectedTab()).toHaveTextContent("2026");
    expect(screen.getByRole("group", { name: "Chama de 2026" })).toBeInTheDocument();
    expect(screen.getByText("Ano em andamento")).toBeInTheDocument();
  });

  it("shows the four figures of the selected year", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const figures = screen.getByRole("list", { name: "Energia de 2026" });

    expect(within(figures).getByText("Maior sequência").previousSibling).toHaveTextContent("4 dias");
    expect(within(figures).getByText("Sequência atual").previousSibling).toHaveTextContent("0 dias");
    expect(within(figures).getByText("Dias ativos").previousSibling).toHaveTextContent("9");
    expect(within(figures).getByText("Contribuições").previousSibling).toHaveTextContent("49");
  });

  it("draws the year as a grid of days whose accessible names carry date, contributions and level", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const grid = screen.getByRole("grid", { name: "Calendário de energia de 2026" });

    expect(within(grid).getAllByRole("row")).toHaveLength(7);
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(282);
    expect(
      within(grid).getByRole("gridcell", { name: "15 de março de 2026: 34 contribuições. Nível de energia: Lendário." })
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole("gridcell", { name: "1 de janeiro de 2026: 0 contribuições. Nível de energia: Adormecido." })
    ).toBeInTheDocument();
  });

  it("uses exactly one tab stop for the whole grid", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const stops = screen.getAllByRole("gridcell").filter((cell) => cell.getAttribute("tabindex") === "0");

    expect(stops).toHaveLength(1);
    // The newest day of the year in progress.
    expect(stops[0]).toHaveAccessibleName(/^9 de outubro de 2026/);
  });

  it("changes the figures, the records and the reading when the year changes", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const oracle = () => screen.getByRole("heading", { name: "Leitura dos Oráculos" }).parentElement as HTMLElement;
    const records = () => screen.getByRole("heading", { name: "Recordes do Herói" }).parentElement as HTMLElement;

    expect(within(records()).getByText("Maior dia").nextSibling).toHaveTextContent("34 contribuições");

    fireEvent.click(screen.getByRole("radio", { name: "2025" }));

    expect(selectedTab()).toHaveTextContent("2025");
    expect(screen.getByRole("group", { name: "Chama de 2025" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Calendário de energia de 2025" })).toBeInTheDocument();
    expect(screen.queryByText("Ano em andamento")).not.toBeInTheDocument();
    // 2025 (52 Saturdays x 3) is clearly above the finished 2024 before it.
    expect(within(oracle()).getByText(/Seu poder cresce/)).toBeInTheDocument();
    // 52 Saturdays x 3
    expect(within(records()).getByText("Maior dia").nextSibling).toHaveTextContent("3 contribuições");
    expect(within(records()).getByText("Maior mês").nextSibling).toHaveTextContent(/\d+ contribuições/);
    expect(screen.getByRole("list", { name: "Energia de 2025" })).toBeInTheDocument();
    expect(screen.getByText("Sequência no fim do ano")).toBeInTheDocument();
    expect(screen.queryByText("Sequência atual")).not.toBeInTheDocument();
  });

  it("keeps the figures of every year in memory: switching never needs anything else", () => {
    render(<ActivityFlameSection model={MULTI} />);
    for (const year of ["2024", "2025", "2026", "2024"]) {
      fireEvent.click(screen.getByRole("radio", { name: year }));
      expect(selectedTab()).toHaveTextContent(year);
    }
  });

  it("moves between years with the arrow keys, Home and End", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const strip = screen.getByRole("radiogroup");

    fireEvent.keyDown(strip, { key: "ArrowLeft" });
    expect(selectedTab()).toHaveTextContent("2025");
    fireEvent.keyDown(strip, { key: "Home" });
    expect(selectedTab()).toHaveTextContent("2024");
    fireEvent.keyDown(strip, { key: "ArrowLeft" });
    expect(selectedTab()).toHaveTextContent("2024");
    fireEvent.keyDown(strip, { key: "End" });
    expect(selectedTab()).toHaveTextContent("2026");
    // Only the selected year is a tab stop (roving tabindex).
    expect(tabs().filter((tab) => tab.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("moves between days with the arrow keys and keeps one tab stop", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const grid = screen.getByRole("grid");
    const stop = () => screen.getAllByRole("gridcell").find((cell) => cell.getAttribute("tabindex") === "0")!;

    // Newest day: Friday, October 9th.
    fireEvent.keyDown(stop(), { key: "ArrowUp" });
    expect(stop()).toHaveAccessibleName(/^8 de outubro de 2026/);
    fireEvent.keyDown(stop(), { key: "ArrowLeft" });
    expect(stop()).toHaveAccessibleName(/^1 de outubro de 2026/);
    fireEvent.keyDown(stop(), { key: "Home" });
    expect(stop()).toHaveAccessibleName(/^1 de janeiro de 2026/);
    fireEvent.keyDown(stop(), { key: "ArrowLeft" });
    expect(stop()).toHaveAccessibleName(/^1 de janeiro de 2026/); // the first day is a wall, not a wrap
    fireEvent.keyDown(stop(), { key: "End" });
    expect(stop()).toHaveAccessibleName(/^9 de outubro de 2026/);
    expect(within(grid).getAllByRole("gridcell").filter((cell) => cell.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("shows the premium tooltip on focus and hides it with Escape", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const day = screen.getByRole("gridcell", { name: /^15 de março de 2026/ });

    fireEvent.focus(day);
    expect(screen.getByText("34 contribuições")).toBeInTheDocument();
    expect(screen.getByText("Nível de energia: Lendário")).toBeInTheDocument();

    fireEvent.keyDown(day, { key: "Escape" });
    expect(screen.queryByText("Nível de energia: Lendário")).not.toBeInTheDocument();
  });

  it("shows the tooltip on hover and on tap, and hides it when the pointer leaves", () => {
    render(<ActivityFlameSection model={MULTI} />);
    const grid = screen.getByRole("grid");
    const day = screen.getByRole("gridcell", { name: /^15 de março de 2026/ });

    fireEvent.mouseOver(day);
    expect(screen.getByText("Nível de energia: Lendário")).toBeInTheDocument();
    fireEvent.mouseLeave(grid);
    expect(screen.queryByText("Nível de energia: Lendário")).not.toBeInTheDocument();

    fireEvent.click(day);
    expect(screen.getByText("Nível de energia: Lendário")).toBeInTheDocument();
  });

  it("treats the days before the account existed as outside the journey: not cells, not focusable", () => {
    const model = build(
      calendarOf({ 2026: sparseYear(2026, { "2026-03-10": 2, "2026-03-11": 1 }, "2026-10-09") }),
      "2026-03-10T08:00:00Z"
    );
    render(<ActivityFlameSection model={model} />);

    // March 10th .. October 9th.
    expect(screen.getAllByRole("gridcell")).toHaveLength(214);
    expect(screen.queryByRole("gridcell", { name: /^1 de janeiro/ })).not.toBeInTheDocument();
  });

  it("works with a single year", () => {
    const model = build(calendarOf({ 2026: sparseYear(2026, { "2026-09-01": 1 }, "2026-10-09") }), "2026-08-01T00:00:00Z");
    render(<ActivityFlameSection model={model} />);

    expect(tabs()).toHaveLength(1);
    expect(selectedTab()).toHaveTextContent("2026");
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(selectedTab()).toHaveTextContent("2026");
  });

  it("speaks English when the language changes, with locale dates and level names", () => {
    render(<ActivityFlameSection model={MULTI} />);
    setLanguage("en");

    expect(screen.getByRole("heading", { level: 2, name: "Flame of Activity" })).toBeInTheDocument();
    expect(screen.getByText("The energy that shaped this legend.")).toBeInTheDocument();
    expect(screen.getByText("Reading of the Oracles")).toBeInTheDocument();
    expect(screen.getByText("Hero Records")).toBeInTheDocument();
    expect(screen.getByText("Year in progress")).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "March 15, 2026: 34 contributions. Energy level: Legendary." })
    ).toBeInTheDocument();
    expect(screen.queryByText("Leitura dos Oráculos")).not.toBeInTheDocument();
  });

  it("explains a partially read history without treating missing years as empty", () => {
    const partial = build(
      calendarOf({ 2023: flatYear(2023, 1), 2025: flatYear(2025, 1) }, "partial")
    );
    render(<ActivityFlameSection model={partial} />);

    expect(screen.getByRole("note")).toHaveTextContent(/nunca são tratados como vazios/);
    expect(tabs().map((tab) => tab.textContent)).toEqual(["2023", "2025"]);
  });

  it("does not show a coverage note for a fully read history", () => {
    render(<ActivityFlameSection model={MULTI} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  describe("empty states", () => {
    it("without a calendar: an elegant panel, never an error, no controls", () => {
      render(<ActivityFlameSection model={EMPTY_UNAVAILABLE} />);

      expect(screen.getByRole("heading", { level: 2, name: "Chama da Atividade" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("O fogo desta lenda ainda não foi registrado pelos Oráculos.");
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      expect(screen.queryByText(/erro|error|undefined|NaN/i)).not.toBeInTheDocument();
    });

    it("with a calendar in which nothing was ever lit: says so, instead of a wall of dark cells", () => {
      render(<ActivityFlameSection model={EMPTY_DORMANT} />);

      expect(screen.getByRole("status")).toHaveTextContent("Nenhuma chama foi acesa ainda.");
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("is translated", () => {
      setLanguage("en");
      render(<ActivityFlameSection model={EMPTY_UNAVAILABLE} />);
      expect(screen.getByRole("status")).toHaveTextContent("The fire of this legend has not yet been recorded by the Oracles.");
    });
  });

  describe("ignition", () => {
    const heat = () => document.querySelector<HTMLElement>(".af-heat")!;

    it("lights the runes at once when there is no IntersectionObserver", () => {
      render(<ActivityFlameSection model={MULTI} />);
      expect(heat().dataset.phase).toBe("settled");
    });

    it("lights the runes at once when the visitor asked for reduced motion", () => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
      vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
      render(<ActivityFlameSection model={MULTI} />);

      expect(heat().dataset.phase).toBe("settled");
    });

    it("keeps the runes unlit until the section is seen, ignites them, then settles", () => {
      vi.useFakeTimers();
      let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () => {};
      const disconnect = vi.fn();
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(callback: typeof notify) {
            notify = callback;
          }
          observe() {}
          disconnect = disconnect;
        }
      );
      try {
        render(<ActivityFlameSection model={MULTI} />);
        expect(heat().dataset.phase).toBe("idle");

        act(() => notify([{ isIntersecting: false }]));
        expect(heat().dataset.phase).toBe("idle");

        act(() => notify([{ isIntersecting: true }]));
        expect(heat().dataset.phase).toBe("igniting");
        expect(disconnect).toHaveBeenCalled();

        act(() => {
          vi.advanceTimersByTime(1500);
        });
        expect(heat().dataset.phase).toBe("settled");

        // Changing the year afterwards never replays the ignition.
        fireEvent.click(screen.getByRole("radio", { name: "2025" }));
        expect(heat().dataset.phase).toBe("settled");
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
