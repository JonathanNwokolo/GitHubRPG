import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaries, type SupportedLanguage } from "@/i18n";
import { formatCount, pluralize } from "@/lib/format";
import { buildDeveloperChronicle } from "./buildDeveloperChronicle";
import {
  describeInterlude,
  describePresent,
  describeSummary,
  describeYear,
  highlightDetail,
  highlightLabel,
} from "./chronicleText";
import { monthlyProfile, noHistoryProfile, yearlyProfile } from "./testing/fixtures";
import type { ChronicleHighlight, ChronicleInterlude, ChronicleYear } from "./types";

const REF = "2026-10-01T00:00:00Z";
const LANGUAGES: SupportedLanguage[] = ["pt-BR", "en"];

const sample = buildDeveloperChronicle(
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

function yearEntry(year: number): ChronicleYear {
  const found = sample.years.find((y) => y.year === year);
  if (!found) throw new Error(`no ${year}`);
  return found;
}

describe("pluralization", () => {
  const forms = { one: "contribuição", other: "contribuições" };

  it("uses the singular only for exactly 1 (zero is plural)", () => {
    expect(pluralize(1, forms)).toBe("contribuição");
    expect(pluralize(0, forms)).toBe("contribuições");
    expect(pluralize(2, forms)).toBe("contribuições");
    expect(pluralize(1204, forms)).toBe("contribuições");
  });

  it("formats counts in each language, with thousands separators and lower-bound marks", () => {
    expect(formatCount(1, forms, "pt-BR")).toBe("1 contribuição");
    expect(formatCount(2, forms, "pt-BR")).toBe("2 contribuições");
    expect(formatCount(1204, forms, "pt-BR")).toBe("1.204 contribuições");
    expect(formatCount(1204, { one: "contribution", other: "contributions" }, "en")).toBe("1,204 contributions");
    expect(formatCount(1204, forms, "pt-BR", "partial")).toBe("≥ 1.204 contribuições");
  });

  for (const language of LANGUAGES) {
    it(`every unit of ${language} has distinct, non-empty singular and plural forms`, () => {
      for (const [unit, units] of Object.entries(dictionaries[language].chronicle.units)) {
        expect(units.one, unit).not.toBe("");
        expect(units.other, unit).not.toBe("");
        expect(units.one, unit).not.toBe(units.other);
      }
    });
  }

  it("a metric of 1 reads in the singular, in both languages", () => {
    const labels = (language: SupportedLanguage) =>
      describeYear(yearEntry(2026), sample, language).metrics.map((metric) => `${metric.value} ${metric.label}`);
    expect(labels("pt-BR")).toEqual(["250 contribuições", "187 commits", "1 pull request", "1 review"]);
    expect(labels("en")).toEqual(["250 contributions", "187 commits", "1 pull request", "1 review"]);
  });

  it("an interlude of one year is just its figure, of several it says how many years ('ano' / 'anos')", () => {
    const one: ChronicleInterlude = { type: "interlude", fromYear: 2016, toYear: 2016, yearCount: 1, contributions: 1, exact: true, quiet: false };
    const many: ChronicleInterlude = { ...one, fromYear: 2020, toYear: 2022, yearCount: 3, contributions: 570 };
    expect(describeInterlude(one, "pt-BR")).toEqual({ range: "2016", text: "1 contribuição." });
    expect(describeInterlude({ ...one, contributions: 2425 }, "en").text).toBe("2,425 contributions.");
    expect(describeInterlude(many, "pt-BR")).toEqual({ range: "2020–2022", text: "570 contribuições ao longo de 3 anos." });
    expect(describeInterlude(many, "en").text).toBe("570 contributions over 3 years.");
  });
});

describe("describeYear", () => {
  it("opens the journey with the real date, in each language", () => {
    const start = yearEntry(2019);
    expect(describeYear(start, sample, "pt-BR")).toMatchObject({
      year: 2019,
      title: "O Início da Jornada",
      description: "Jonathan iniciou sua jornada no GitHub em 12 de mar. de 2019.",
    });
    expect(describeYear(start, sample, "en")).toMatchObject({
      title: "The Journey Begins",
      description: "Jonathan began their journey on GitHub on Mar 12, 2019.",
    });
  });

  it("ends with the current chapter, and does not project", () => {
    const current = describeYear(yearEntry(2026), sample, "pt-BR");
    expect(current.title).toBe("Capítulo Atual");
    expect(current.description).toBe("A jornada continua.");
    expect(describeYear(yearEntry(2026), sample, "en").description).toBe("The journey continues.");
  });

  it("states the fact that named the chapter, with real numbers, and lists the other facts apart", () => {
    const view = describeYear(yearEntry(2025), sample, "pt-BR");
    expect(view.title).toBe("O Grande Avanço");
    expect(view.description).toBe("A atividade registrada subiu 113% em relação a 2024.");
    expect(view.highlights.map((h) => h.label)).toEqual(["Ano Mais Ativo", "Mestre da Colaboração", "Recorde de Commits", "Marco Histórico"]);
    expect(view.highlights[0].detail).toBe("Seu período mais ativo registrado: 1.300 contribuições.");
  });

  it("names only the collaboration that happened (no '0 reviews')", () => {
    const base = { kind: "peakCollaboration", year: 2025, rarity: "exceptional" } as const;
    const who = { adventurerName: "Ada" };
    expect(highlightDetail({ ...base, pullRequests: 30, reviews: 0 }, who, "pt-BR")).toBe(
      "O ano de maior colaboração registrada: 30 pull requests."
    );
    expect(highlightDetail({ ...base, pullRequests: 0, reviews: 1 }, who, "en")).toBe(
      "The year of greatest recorded collaboration: 1 review."
    );
    expect(highlightDetail({ ...base, pullRequests: 1, reviews: 2 }, who, "en")).toBe(
      "The year of greatest recorded collaboration: 1 pull request and 2 reviews."
    );
  });

  it("never says an ongoing streak 'ended'", () => {
    const ongoing: ChronicleHighlight = {
      kind: "longestStreak",
      year: 2026,
      rarity: "exceptional",
      days: 99,
      start: "2026-06-30",
      end: "2026-10-06",
      ongoing: true,
    };
    expect(highlightDetail(ongoing, sample, "pt-BR")).toBe(
      "A maior sequência de dias ativos segue em andamento: 99 dias, desde 30 de jun. de 2026."
    );
    expect(highlightDetail(ongoing, sample, "en")).toBe(
      "The longest streak of active days is still going: 99 days, since Jun 30, 2026."
    );
    expect(highlightDetail(ongoing, sample, "pt-BR")).not.toMatch(/terminou/);
  });

  it("describes the streak with its real dates", () => {
    const streak = sample.highlights.find((h) => h.kind === "longestStreak");
    expect(streak).toBeDefined();
    expect(highlightDetail(streak as ChronicleHighlight, sample, "en")).toBe(
      "The longest streak of active days ended this year: 22 days, from Dec 20, 2023 to Jan 10, 2024."
    );
  });

  it("marks lower-bound figures and unread years instead of showing precision", () => {
    const partial = buildDeveloperChronicle(
      monthlyProfile("2024-11-15T00:00:00Z", REF, Array.from({ length: 23 }, () => 20), "partial")
    );
    const view = describeYear(partial.years[0], partial, "pt-BR");
    expect(view.metrics[0].value.startsWith("≥ ")).toBe(true);

    const missing = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2018-04-01T00:00:00Z",
        referenceDate: REF,
        omitYears: [2018, 2019],
        yearlyCoverage: "partial",
        years: { 2020: 100, 2021: 200, 2026: 50 },
      })
    );
    expect(describeYear(missing.years[0], missing, "en").unknownNote).toBe("The data for this year could not be read.");
    expect(describeYear(missing.years[0], missing, "en").metrics).toEqual([]);
  });

  it("flags the in-progress year when it is the most active one", () => {
    const rich = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2019-03-12T00:00:00Z", referenceDate: REF, years: { 2019: 40, 2020: 100, 2026: 900 } })
    );
    const highlight = rich.highlights.find((h) => h.kind === "mostActiveYear") as ChronicleHighlight;
    expect(highlightLabel(highlight, "pt-BR")).toBe("Ano Mais Ativo (até agora)");
    expect(highlightDetail(highlight, rich, "pt-BR")).toBe("Até agora, seu período mais ativo registrado: 900 contribuições.");
  });
});

describe("describeSummary", () => {
  it("shows the four figures of the journey", () => {
    expect(describeSummary(sample, "pt-BR")).toEqual([
      { id: "journeyLength", label: "Tempo de jornada", value: "7 anos" },
      { id: "mostActiveYear", label: "Ano mais ativo", value: "2025" },
      { id: "longestStreak", label: "Maior sequência", value: "22 dias" },
      { id: "totalContributions", label: "Total de contribuições", value: "3.112" },
    ]);
    expect(describeSummary(sample, "en").map((item) => item.value)).toEqual(["7 years", "2025", "22 days", "3,112"]);
  });

  it("leaves out what is unavailable instead of showing a zero", () => {
    const none = buildDeveloperChronicle(noHistoryProfile("2019-03-12T00:00:00Z", REF));
    expect(describeSummary(none, "pt-BR").map((item) => item.id)).toEqual(["journeyLength"]);
  });

  it("says 'known' and 'at least' when the history is partial", () => {
    const partial = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2018-04-01T00:00:00Z",
        referenceDate: REF,
        omitYears: [2018, 2019, 2020],
        yearlyCoverage: "partial",
        years: { 2021: 100, 2022: 200, 2023: 300, 2024: 400, 2025: 500, 2026: 100 },
      })
    );
    const items = describeSummary(partial, "pt-BR");
    expect(items.find((item) => item.id === "mostActiveYear")?.label).toBe("Maior ano conhecido");
    expect(items.find((item) => item.id === "totalContributions")).toEqual({
      id: "totalContributions",
      label: "Contribuições registradas",
      value: "≥ 1.600",
    });
  });

  it("measures a young account in months, and a brand-new one as less than a month", () => {
    const months = buildDeveloperChronicle(yearlyProfile({ createdAt: "2026-05-02T00:00:00Z", referenceDate: REF, years: {} }));
    expect(describeSummary(months, "pt-BR")[0].value).toBe("4 meses");
    const fresh = buildDeveloperChronicle(yearlyProfile({ createdAt: "2026-09-20T00:00:00Z", referenceDate: REF, years: {} }));
    expect(describeSummary(fresh, "pt-BR")[0].value).toBe("menos de 1 mês");
    expect(describeSummary(fresh, "en")[0].value).toBe("less than 1 month");
  });
});

describe("describePresent", () => {
  it("speaks in the present tense, never as history", () => {
    const withStars = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2019-03-12T00:00:00Z",
        referenceDate: REF,
        years: {},
        overrides: { starsReceived: { value: 1, coverage: "full" } },
      })
    );
    expect(describePresent(withStars, "pt-BR")).toEqual([]);

    const rich = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2019-03-12T00:00:00Z",
        referenceDate: REF,
        years: {},
        overrides: {
          starsReceived: { value: 1200, coverage: "full" },
          languages: [{ name: "TypeScript", bytes: 10, repoCount: 1 }],
        },
      })
    );
    expect(describePresent(rich, "pt-BR")).toEqual([
      "Atualmente, TypeScript é sua principal afinidade.",
      "Hoje, seus repositórios próprios somam 1.200 estrelas.",
    ]);
    expect(describePresent(rich, "en")[0]).toBe("Currently, TypeScript is their main affinity.");
  });
});

describe("dictionaries", () => {
  const ALL_HIGHLIGHTS: ChronicleHighlight[] = [
    { kind: "firstChapter", year: 2019, rarity: "important", date: "2019-03-12" },
    { kind: "firstActivity", year: 2020, rarity: "important", contributions: 1 },
    { kind: "mostActiveYear", year: 2025, rarity: "exceptional", contributions: 9, partial: false, inProgress: false },
    { kind: "mostActiveYear", year: 2025, rarity: "exceptional", contributions: 9, partial: true, inProgress: false },
    { kind: "mostActiveYear", year: 2026, rarity: "exceptional", contributions: 9, partial: false, inProgress: true },
    { kind: "mostActiveYear", year: 2026, rarity: "exceptional", contributions: 9, partial: true, inProgress: true },
    { kind: "peakCommits", year: 2025, rarity: "exceptional", commits: 1 },
    { kind: "peakCollaboration", year: 2025, rarity: "exceptional", pullRequests: 1, reviews: 2 },
    { kind: "longestStreak", year: 2025, rarity: "exceptional", days: 1, start: "2025-01-01", end: "2025-01-01", ongoing: false },
    { kind: "longestStreak", year: 2026, rarity: "exceptional", days: 99, start: "2026-06-30", end: "2026-10-06", ongoing: true },
    { kind: "growth", year: 2025, rarity: "important", percent: 68, previousYear: 2024, doubled: false },
    { kind: "decline", year: 2025, rarity: "normal", percent: 58, previousYear: 2024 },
    { kind: "return", year: 2025, rarity: "important", dormantYears: 1, contributions: 1 },
    { kind: "milestone", year: 2025, rarity: "important", threshold: 1000 },
  ];

  for (const language of LANGUAGES) {
    it(`${language}: every kind of highlight renders a label and a sentence with no placeholder left`, () => {
      for (const highlight of ALL_HIGHLIGHTS) {
        const label = highlightLabel(highlight, language);
        const detail = highlightDetail(highlight, { adventurerName: "Ada" }, language);
        expect(label, highlight.kind).not.toBe("");
        expect(detail, highlight.kind).not.toMatch(/[{}]/);
        expect(detail, highlight.kind).not.toBe("");
      }
    });
  }

  it("both languages use the same placeholders in every sentence", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const pt = dictionaries["pt-BR"].chronicle;
    const en = dictionaries.en.chronicle;
    for (const group of ["details", "interlude", "present"] as const) {
      const ptGroup: Record<string, string> = pt[group];
      const enGroup: Record<string, string> = en[group];
      expect(Object.keys(enGroup).sort(), group).toEqual(Object.keys(ptGroup).sort());
      for (const key of Object.keys(ptGroup)) {
        expect(placeholders(enGroup[key]), `${group}.${key}`).toEqual(placeholders(ptGroup[key]));
      }
    }
  });
});

describe("no hardcoded Portuguese outside the dictionary", () => {
  const DIR = __dirname;
  const files = readdirSync(DIR).filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name));

  it("finds the Chronicle files", () => {
    expect(files).toContain("chronicleText.ts");
  });

  it("source files hold no accented (Portuguese) text", () => {
    const offenders = files.filter((name) => /[áàâãéêíóôõúç]/i.test(readFileSync(resolve(DIR, name), "utf8")));
    expect(offenders).toEqual([]);
  });
});
