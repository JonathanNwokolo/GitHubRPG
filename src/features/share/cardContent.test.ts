import { describe, expect, it } from "vitest";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { yearlyProfile } from "@/features/chronicle/testing/fixtures";
import { createRPGCharacter } from "@/game/createCharacter";
import { m, makeAverageProfile } from "@/test/builders";
import {
  buildAchievementCardContent,
  buildChronicleCardContent,
  formatCardLowerBound,
  isValidAchievementId,
} from "./cardContent";

const profile = makeAverageProfile({ username: "artorias", displayName: "Artorias Silva" });
const character = createRPGCharacter(profile);
const unlocked = character.achievements.filter((a) => a.unlocked);
const locked = character.achievements.filter((a) => !a.unlocked);

describe("achievement card content", () => {
  it("the fixture has both unlocked and locked achievements", () => {
    expect(unlocked.length).toBeGreaterThan(0);
    expect(locked.length).toBeGreaterThan(0);
  });

  it("builds the card of an unlocked achievement from the engine's own data", () => {
    const achievement = unlocked[0];
    const content = buildAchievementCardContent(character, achievement.id, "pt-BR");

    expect(content).toMatchObject({
      username: "artorias",
      displayName: "Artorias Silva",
      achievement: { name: achievement.name, description: achievement.description, rarity: achievement.rarity },
      texts: { kicker: "CONQUISTA DESBLOQUEADA", cta: "Transforme seu GitHub em um personagem RPG." },
    });
    expect(content?.texts.rarityLabel).toBe({ common: "Comum", rare: "Rara", epic: "Épica", legendary: "Lendária" }[achievement.rarity]);
  });

  it("shows the value that unlocked it (the goal reached)", () => {
    const years = unlocked.find((a) => a.id === "age-3");
    expect(years).toBeDefined();
    expect(buildAchievementCardContent(character, "age-3", "pt-BR")?.achievement.progress).toBe("3+ anos");
  });

  it("speaks English when asked, with the same data", () => {
    const content = buildAchievementCardContent(character, "age-3", "en");

    expect(content?.texts.kicker).toBe("ACHIEVEMENT UNLOCKED");
    expect(content?.texts.cta).toBe("Turn your GitHub into an RPG character.");
    expect(content?.achievement.progress).toBe("3+ years");
    // Engine content (names, descriptions) is not translated in this cycle.
    expect(content?.achievement.name).toBe(unlocked.find((a) => a.id === "age-3")?.name);
  });

  it("a locked achievement has no card", () => {
    for (const achievement of locked) {
      expect(buildAchievementCardContent(character, achievement.id, "pt-BR"), achievement.id).toBeNull();
    }
  });

  it("an id that is not in the catalog has no card", () => {
    for (const id of ["foo", "age-4", "commits-0", "AGE-3", ""]) {
      expect(buildAchievementCardContent(character, id, "pt-BR"), id).toBeNull();
    }
  });

  it("partial coverage says 'at least', exactly like the sheet does", () => {
    const partial = createRPGCharacter(makeAverageProfile({ username: "partial-dev", commits: m(1_500, "partial") }));
    const commits = partial.achievements.find((a) => a.id === "commits-1000");
    expect(commits?.unlocked).toBe(true);

    expect(buildAchievementCardContent(partial, "commits-1000", "en")?.achievement.progress).toBe("At least 1,500 commits found");
    expect(buildAchievementCardContent(partial, "commits-1000", "pt-BR")?.achievement.progress).not.toContain("≥");
  });

  it("falls back to the username when there is no display name", () => {
    const anonymous = createRPGCharacter(makeAverageProfile({ username: "no-name" }));
    expect(buildAchievementCardContent(anonymous, "age-3", "pt-BR")?.displayName).toBe("no-name");
  });

  it("validates the id format before any lookup", () => {
    for (const ok of ["age-5", "commits-10000", "languages-8"]) expect(isValidAchievementId(ok), ok).toBe(true);
    for (const bad of ["", "AGE-5", "age_5", "age 5", "../age-5", "age-5?x=1", "a".repeat(41), "<script>"]) {
      expect(isValidAchievementId(bad), bad).toBe(false);
    }
  });
});

describe("chronicle card content", () => {
  const chronicleProfile = yearlyProfile({
    createdAt: "2019-03-12T00:00:00Z",
    referenceDate: "2026-10-01T00:00:00Z",
    years: {
      2019: 40,
      2020: 180,
      2021: 200,
      2022: 190,
      2023: 342,
      2024: 610,
      2025: { contributions: 1300, commits: 521, pullRequests: 62, reviews: 31, issues: 4, activeDays: 250 },
      2026: 250,
    },
    overrides: { username: "artorias", displayName: "Artorias Silva" },
  });
  const chronicleCharacter = createRPGCharacter(chronicleProfile);
  const chronicle = buildDeveloperChronicle(chronicleProfile);

  it("builds the card of the most active year from the Chronicle's own sentences and figures", () => {
    const content = buildChronicleCardContent(chronicleCharacter, chronicle, 2025, "en");

    expect(content).toMatchObject({
      username: "artorias",
      displayName: "Artorias Silva",
      texts: { kicker: "CHRONICLE CHAPTER" },
      chapter: { year: 2025 },
    });
    expect(content?.chapter.title).toBeTruthy();
    expect(content?.chapter.metrics).toContain("521 commits");
    expect(content?.chapter.metrics).toContain("62 pull requests");
    expect(content?.chapter.metrics).toContain("31 reviews");
    expect(content?.chapter.metrics.length).toBeLessThanOrEqual(4);
  });

  it("builds the opening and the current chapter", () => {
    expect(buildChronicleCardContent(chronicleCharacter, chronicle, 2019, "pt-BR")?.chapter.title).toBe("O Início da Jornada");
    expect(buildChronicleCardContent(chronicleCharacter, chronicle, 2026, "pt-BR")?.chapter.year).toBe(2026);
  });

  it("is in the requested language", () => {
    expect(buildChronicleCardContent(chronicleCharacter, chronicle, 2019, "pt-BR")?.texts.kicker).toBe("CAPÍTULO DA CRÔNICA");
    expect(buildChronicleCardContent(chronicleCharacter, chronicle, 2019, "en")?.chapter.title).toBe("The Journey Begins");
  });

  it.each(["pt-BR", "en"] as const)("keeps partial Chronicle metrics renderer-safe in %s", (language) => {
    const partialChronicle = {
      ...chronicle,
      years: chronicle.years.map((entry) =>
        entry.year === 2025
          ? { ...entry, metrics: entry.metrics.map((metric) => ({ ...metric, coverage: "partial" as const })) }
          : entry
      ),
    };
    const content = buildChronicleCardContent(chronicleCharacter, partialChronicle, 2025, language);

    expect(content).not.toBeNull();
    expect(content?.chapter.metrics.some((metric) => metric.includes("≥"))).toBe(false);
    expect(content?.chapter.metrics.some((metric) => /^1[.,]300\+/.test(metric))).toBe(true);
  });

  it("a year that is not a chapter of this chronicle has no card", () => {
    expect(buildChronicleCardContent(chronicleCharacter, chronicle, 1999, "pt-BR")).toBeNull();
    expect(buildChronicleCardContent(chronicleCharacter, chronicle, 2099, "pt-BR")).toBeNull();
  });

  it("a chapter that is not worth a card has no card", () => {
    const quiet = chronicle.years.find((entry) => !entry.isStart && !entry.isCurrent && entry.rarity === "normal");
    if (quiet) expect(buildChronicleCardContent(chronicleCharacter, chronicle, quiet.year, "pt-BR")).toBeNull();
  });
});

describe("image-card lower bounds", () => {
  it.each([
    ["≥ 148 dias", "148+ dias"],
    ["≥ 148", "148+"],
    ["≥1,500 commits", "1,500+ commits"],
    ["≥ 10 contributions", "10+ contributions"],
  ])("formats the isolated PT/EN lower bound %s", (input, expected) => {
    expect(formatCardLowerBound(input)).toBe(expected);
  });

  it.each([
    "148 dias",
    "exactly 148 days",
    "≤ 200 dias",
    "100–200 dias",
    "≥ 148 e ≤ 200 dias",
    "≥ 148 / ≤ 200",
    "between 100 and 200 days",
    "entre 100 e 200 dias",
    "texto arbitrário",
    "arbitrary text",
  ])("preserves exact, upper-bound, range, compound or arbitrary text: %s", (input) => {
    expect(formatCardLowerBound(input)).toBe(input);
  });
});
