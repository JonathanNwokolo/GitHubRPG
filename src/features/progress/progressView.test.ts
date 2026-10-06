import { describe, expect, it } from "vitest";
import { evaluateThreshold } from "@/game/progress";
import { en } from "@/i18n/dictionaries/en";
import { ptBR } from "@/i18n/dictionaries/ptBR";
import { fill, formatCoveredValue } from "@/lib/format";
import { describeProgress } from "./progressView";

const stars = (value: number, target = 1_000, coverage: "full" | "partial" | "unavailable" = "full") =>
  evaluateThreshold({ value, coverage }, target, "stars");

describe("describeProgress", () => {
  it("shows have / goal / remaining for exact data (437 / 1.000 estrelas, 563 to go)", () => {
    const view = describeProgress(stars(437), ptBR, "pt-BR");
    expect(view.state).toBe("exact");
    expect(view.headline).toBe("437 / 1.000 estrelas");
    expect(view.detail).toBe("Faltam 563 estrelas");
    expect(view.barPercent).toBe(43.7);
  });

  it("the unit agrees with its number in pt-BR and en (singular only for exactly 1)", () => {
    const repos = (value: number, target: number) =>
      evaluateThreshold({ value, coverage: "full" }, target, "repositories");

    expect(describeProgress(repos(0, 1), ptBR, "pt-BR").headline).toBe("0 / 1 repositório");
    expect(describeProgress(repos(0, 1), en, "en").headline).toBe("0 / 1 repository");
    expect(describeProgress(repos(1, 5), ptBR, "pt-BR").headline).toBe("1 / 5 repositórios");

    // One left: "Falta 1 estrela" in Portuguese, "1 star to go" in English.
    expect(describeProgress(stars(999), ptBR, "pt-BR").detail).toBe("Falta 1 estrela");
    expect(describeProgress(stars(999), en, "en").detail).toBe("1 star to go");
    expect(describeProgress(stars(998), ptBR, "pt-BR").detail).toBe("Faltam 2 estrelas");
    expect(describeProgress(stars(998), en, "en").detail).toBe("2 stars to go");
  });

  it("'found' agrees with the unit's gender in pt-BR (estrelas/linguagens are feminine)", () => {
    const languages = evaluateThreshold({ value: 1, coverage: "partial" }, 5, "languages");
    expect(describeProgress(languages, ptBR, "pt-BR").headline).toBe("Pelo menos 1 linguagem encontrada");
    expect(describeProgress(languages, en, "en").headline).toBe("At least 1 language found");

    const stars = evaluateThreshold({ value: 3, coverage: "partial" }, 10, "stars");
    expect(describeProgress(stars, ptBR, "pt-BR").headline).toBe("Pelo menos 3 estrelas encontradas");

    const commits = evaluateThreshold({ value: 240, coverage: "partial" }, 1_000, "commits");
    expect(describeProgress(commits, ptBR, "pt-BR").headline).toBe("Pelo menos 240 commits encontrados");
    const oneCommit = evaluateThreshold({ value: 1, coverage: "partial" }, 1_000, "commits");
    expect(describeProgress(oneCommit, ptBR, "pt-BR").headline).toBe("Pelo menos 1 commit encontrado");
  });

  it("shows years with one decimal and an approximate remaining time (4,2 / 5 anos)", () => {
    const years = evaluateThreshold({ value: 4.24, coverage: "full" }, 5, "years");
    const view = describeProgress(years, ptBR, "pt-BR");
    expect(view.headline).toBe("4,2 / 5 anos");
    expect(view.detail).toBe("Faltam aproximadamente 10 meses");
  });

  it("expresses long remaining years in years and months", () => {
    const years = evaluateThreshold({ value: 11.37, coverage: "full" }, 15, "years");
    expect(describeProgress(years, ptBR, "pt-BR").detail).toBe("Faltam aproximadamente 3 anos e 8 meses");
  });

  it("never says what is missing when the data is partial", () => {
    for (const dictionary of [ptBR, en]) {
      const view = describeProgress(stars(240, 1_000, "partial"), dictionary, "pt-BR");
      expect(view.state).toBe("partial");
      expect(view.barPercent).toBeNull();
      const text = [view.headline, view.detail, view.note].join(" ").toLowerCase();
      expect(text).not.toMatch(/faltam|to go|760/);
      expect(view.headline).toContain("240");
    }
  });

  it("an unlocked partial goal reads as 'at least', not as an exact count", () => {
    const view = describeProgress(stars(1_240, 1_000, "partial"), ptBR, "pt-BR");
    expect(view.state).toBe("unlocked");
    expect(view.headline).toBe("Pelo menos 1.240 estrelas encontradas");
    expect(view.barPercent).toBe(100);
  });

  it("an unlocked exact goal reads 100+ style", () => {
    const view = describeProgress(stars(120, 100), ptBR, "pt-BR");
    expect(view).toMatchObject({ state: "unlocked", headline: "100+ estrelas" });
  });

  it("does not invent anything when unavailable", () => {
    const view = describeProgress(stars(0, 1_000, "unavailable"), ptBR, "pt-BR");
    expect(view).toMatchObject({ state: "unavailable", barPercent: null });
    expect(view.detail).toBeUndefined();
  });

  it("both dictionaries define every progress key", () => {
    expect(Object.keys(en.progress).sort()).toEqual(Object.keys(ptBR.progress).sort());
    expect(Object.keys(en.units).sort()).toEqual(Object.keys(ptBR.units).sort());
    for (const unit of Object.keys(ptBR.units) as Array<keyof typeof ptBR.units>) {
      expect(Object.keys(en.units[unit]).sort()).toEqual(["one", "other"]);
      expect(Object.keys(ptBR.units[unit]).sort()).toEqual(["one", "other"]);
    }
  });
});

describe("format helpers", () => {
  it("fill replaces known placeholders only", () => {
    expect(fill("{a} and {b} and {c}", { a: 1, b: "x" })).toBe("1 and x and {c}");
  });

  it("marks partial values with >= and unavailable with a dash", () => {
    expect(formatCoveredValue(1240, "partial", "pt-BR")).toBe("≥ 1.240");
    expect(formatCoveredValue(1240, "full", "en")).toBe("1,240");
    expect(formatCoveredValue(0, "unavailable", "pt-BR")).toBe("—");
  });
});
