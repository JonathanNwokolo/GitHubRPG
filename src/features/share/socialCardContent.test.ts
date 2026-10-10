import { describe, expect, it } from "vitest";
import { buildActivityFlame } from "@/features/activity-flame/buildActivityFlame";
import { calendarOf, flatYear, sparseYear } from "@/features/activity-flame/testing/fixtures";
import { createRPGCharacter } from "@/game/createCharacter";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { createCharacterPresentationModel } from "@/game-v2/publicProjection";
import { m, makeAverageProfile, makeProfile } from "@/test/builders";
import {
  buildSocialCardContent,
  isRenderableCardText,
  pickCardFlameYear,
  SOCIAL_CARD_SIZE,
  type SocialCardContent,
  type SocialCardInput,
} from "./socialCardContent";

const V1_ONLY = createCharacterPresentationModel(false);

const FLAME = buildActivityFlame({
  calendar: calendarOf({
    2025: sparseYear(2025, { "2025-03-01": 3, "2025-03-02": 12, "2025-03-03": 1 }),
    2026: sparseYear(2026, { "2026-09-01": 3, "2026-09-02": 1, "2026-09-03": 8 }, "2026-10-09"),
  }),
  createdAt: "2019-02-14T00:00:00Z",
  referenceDate: "2026-10-09T00:00:00Z",
});

function input(overrides: Partial<SocialCardInput> = {}): SocialCardInput {
  return {
    character: createRPGCharacter(makeAverageProfile({ username: "artorias", displayName: "Artorias Silva" })),
    presentation: V1_ONLY,
    activityFlame: FLAME,
    language: "pt-BR",
    ...overrides,
  };
}

function ready(overrides: Partial<SocialCardInput> = {}): SocialCardContent {
  const result = buildSocialCardContent(input(overrides));
  if (result.status !== "ready") throw new Error(`expected a ready card, got ${result.status}`);
  return result.content;
}

describe("the card format", () => {
  it("is 1080 x 1350 (4:5)", () => {
    expect(SOCIAL_CARD_SIZE).toEqual({ width: 1080, height: 1350 });
    expect(SOCIAL_CARD_SIZE.width / SOCIAL_CARD_SIZE.height).toBeCloseTo(4 / 5);
  });
});

describe("buildSocialCardContent: complete data", () => {
  it("builds the card from the character the sheet shows", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias", displayName: "Artorias Silva" }));
    const content = ready({ character });

    expect(content.username).toBe("artorias");
    expect(content.displayName).toBe("Artorias Silva");
    expect(content.level).toBe(character.progression.level);
    expect(content.className).toBe(character.archetype.className);
    expect(content.subclassName).toBe(character.archetype.subclassName ?? null);
    expect(content.classIcon).toBe(character.archetype.className);
    expect(content.subclassIcon).toBe(character.archetype.subclassName ?? null);
    expect(content.evolutionName).toBeNull();
    expect(content.texts.kicker).toBe("CARTA SOCIAL DO HERÓI");
    expect(content.texts.level).toBe("NÍVEL");
  });

  it("shows at most three affinities, in the sheet's order", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    expect(character.skills.length).toBeGreaterThan(3);
    const content = ready({ character });
    expect(content.affinities.map((affinity) => affinity.name)).toEqual(
      character.skills.slice(0, 3).map((skill) => skill.name)
    );
  });

  it("falls back to the username for a display name the renderer's font cannot draw", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "yamada", displayName: "山田 太郎" }));
    expect(ready({ character }).displayName).toBe("yamada");
  });

  it("keeps accented Latin names and clips very long ones", () => {
    const accented = createRPGCharacter(makeAverageProfile({ username: "joao", displayName: "João Conceição" }));
    expect(ready({ character: accented }).displayName).toBe("João Conceição");

    const long = createRPGCharacter(makeAverageProfile({ username: "long", displayName: "A".repeat(80) }));
    const name = ready({ character: long }).displayName;
    expect([...name].length).toBeLessThanOrEqual(36);
    expect(name.endsWith("…")).toBe(true);
  });

  it("uses the username when the account has no display name", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias", displayName: undefined }));
    expect(ready({ character }).displayName).toBe("artorias");
  });
});

describe("buildSocialCardContent: title", () => {
  it("is the equipped title when the visitor picked an unlocked one", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const unlocked = character.titles.filter((title) => title.unlocked);
    expect(unlocked.length).toBeGreaterThan(1);
    const pick = unlocked.find((title) => title.id !== character.defaultTitleId) ?? unlocked[0];
    expect(ready({ character, titleId: pick.id }).title).toBe(pick.name);
  });

  it("is the engine's default when no pick is sent, or the pick is locked or unknown", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const fallback = character.titles.find((title) => title.id === character.defaultTitleId)?.name ?? null;
    const locked = character.titles.find((title) => !title.unlocked);

    expect(ready({ character }).title).toBe(fallback);
    expect(ready({ character, titleId: locked?.id }).title).toBe(fallback);
    expect(ready({ character, titleId: "title-that-does-not-exist" }).title).toBe(fallback);
  });

  it("is null when the hero has no unlocked title (the card then omits it)", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const none = { ...character, titles: character.titles.map((title) => ({ ...title, unlocked: false })), defaultTitleId: null };
    expect(ready({ character: none }).title).toBeNull();
  });
});

describe("buildSocialCardContent: subclass", () => {
  it("is null for a hero without one (never an empty string)", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const bare = { ...character, archetype: { ...character.archetype, subclassName: undefined } };
    expect(ready({ character: bare }).subclassName).toBeNull();
    expect(ready({ character: bare }).subclassIcon).toBeNull();
  });
});

describe("buildSocialCardContent: Game Engine V2", () => {
  const fixture = GOLDEN_FIXTURES.architecturalSystem();
  const character = createRPGCharacter(fixture.profile);
  const v2 = createRPGCharacterV2(fixture);
  const presentation = createCharacterPresentationModel(true, { state: "ready", character: v2 });

  it("takes class, subclass, evolution and affinities from V2 when it is available", () => {
    const content = ready({ character, presentation });
    const projected = presentation.v2!;
    expect(content.className).toBe(projected.identity.className);
    expect(content.subclassName).toBe(projected.identity.subclass?.name.pt ?? null);
    expect(content.evolutionName).toBe(projected.identity.evolution?.name.pt ?? null);
    expect(content.classIcon).toBe(projected.identity.className);
    // A V2 specialization has no insignia on the sheet either.
    expect(content.subclassIcon).toBeNull();
    expect(content.affinities.map((affinity) => affinity.name)).toEqual(
      projected.grimoire.affinities.slice(0, 3).map((affinity) => affinity.name)
    );
  });

  it("follows the requested language for V2 names", () => {
    const content = ready({ character, presentation, language: "en" });
    expect(content.subclassName).toBe(presentation.v2!.identity.subclass?.name.en ?? null);
    expect(content.texts.kicker).toBe("HERO SOCIAL CARD");
  });

  it("waits (pending) while V2 is being resolved, instead of showing a V1 class the sheet is about to replace", () => {
    const enriching = createCharacterPresentationModel(true, { state: "enriching", character: null });
    expect(buildSocialCardContent(input({ character, presentation: enriching })).status).toBe("pending");
  });

  it("uses V1 once the sheet itself has fallen back to V1 (V2 unavailable)", () => {
    const unavailable = createCharacterPresentationModel(true, { state: "unavailable", character: null });
    const result = buildSocialCardContent(input({ character, presentation: unavailable }));
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.content.className).toBe(character.archetype.className);
  });
});

describe("buildSocialCardContent: partial coverage", () => {
  it("is unavailable when the calculated numbers cannot be published (no degraded card)", () => {
    const partial = createRPGCharacter(makeAverageProfile({ commits: m(0, "unavailable") }));
    expect(partial.calculationCoverage.sharing.calculatedNumbersPublishable).toBe(false);
    expect(buildSocialCardContent(input({ character: partial })).status).toBe("unavailable");
  });

  it("is unavailable for a wholly unavailable sheet too", () => {
    const sheet = createRPGCharacter(makeProfile({ commits: m(0, "unavailable"), pullRequests: m(0, "unavailable") }));
    expect(buildSocialCardContent(input({ character: sheet })).status).toBe("unavailable");
  });
});

describe("buildSocialCardContent: the mini Chama da Atividade", () => {
  it("shows the most recent read year with its metrics and the sheet's own levels", () => {
    const flame = ready().flame!;
    const year = FLAME.years.find((entry) => entry.year === 2026)!;

    expect(flame.year).toBe(2026);
    expect(flame.inProgress).toBe(true);
    expect(flame.levels).toHaveLength(year.counts.length);
    expect(flame.levels[0]).toBe(0);
    expect(Math.max(...flame.levels)).toBeGreaterThan(0);
    expect(flame.startDow).toBe(4); // 2026-01-01 was a Thursday
    expect(flame.metrics.map((metric) => metric.id)).toEqual(["contributions", "longestStreak", "activeDays"]);
    expect(flame.metrics.map((metric) => metric.label)).toEqual(["Contribuições", "Maior sequência", "Dias ativos"]);
    expect(flame.metrics[0].value).toBe("12"); // 3 + 1 + 8
    expect(flame.metrics[1].value).toBe("3 dias");
    expect(flame.metrics[2].value).toBe("3");
  });

  it("says the same in English", () => {
    const flame = ready({ language: "en" }).flame!;
    expect(flame.metrics.map((metric) => metric.label)).toEqual(["Contributions", "Longest streak", "Active days"]);
    expect(flame.metrics[1].value).toBe("3 days");
  });

  it("has no panel without a calendar, with an unavailable one, or one in which nothing was ever lit", () => {
    expect(ready({ activityFlame: undefined }).flame).toBeNull();

    const unavailable = buildActivityFlame({ calendar: null, createdAt: "2019-02-14T00:00:00Z", referenceDate: "2026-10-09T00:00:00Z" });
    expect(ready({ activityFlame: unavailable }).flame).toBeNull();

    const dormant = buildActivityFlame({
      calendar: calendarOf({ 2026: flatYear(2026, 0, "2026-10-09") }),
      createdAt: "2019-02-14T00:00:00Z",
      referenceDate: "2026-10-09T00:00:00Z",
    });
    expect(ready({ activityFlame: dormant }).flame).toBeNull();
  });

  it("shows the latest year that was lit when the current one is still dark", () => {
    const model = buildActivityFlame({
      calendar: calendarOf({
        2025: sparseYear(2025, { "2025-06-01": 5, "2025-06-02": 5 }),
        2026: flatYear(2026, 0, "2026-10-09"),
      }),
      createdAt: "2019-02-14T00:00:00Z",
      referenceDate: "2026-10-09T00:00:00Z",
    });
    expect(pickCardFlameYear(model)?.year).toBe(2025);
    expect(ready({ activityFlame: model }).flame?.year).toBe(2025);
  });

  it("never draws an unread year: a partial calendar shows only a year that was really read", () => {
    const model = buildActivityFlame({
      calendar: calendarOf({ 2024: sparseYear(2024, { "2024-05-01": 4, "2024-05-02": 4 }) }, "partial"),
      createdAt: "2019-02-14T00:00:00Z",
      referenceDate: "2026-10-09T00:00:00Z",
    });
    expect(model.coverage).toBe("partial");
    const flame = ready({ activityFlame: model }).flame!;
    expect(flame.year).toBe(2024);
    expect(flame.inProgress).toBe(false);
  });

  it("writes a lower-bound streak with a plus sign (the card font has no ≥)", () => {
    // 2025 is read, 2024 is not: a run that starts on January 1st of 2025 may continue into the unread year.
    const model = buildActivityFlame({
      calendar: calendarOf({ 2025: flatYear(2025, 2) }, "partial"),
      createdAt: "2019-02-14T00:00:00Z",
      referenceDate: "2026-10-09T00:00:00Z",
    });
    const metric = ready({ activityFlame: model }).flame!.metrics[1];
    expect(metric.value).toMatch(/^365\+ dias$/);
    expect(metric.value).not.toContain("≥");
  });
});

describe("isRenderableCardText", () => {
  it("accepts Latin text with accents and rejects other scripts and symbols the font lacks", () => {
    expect(isRenderableCardText("Jonathan Nwokolo")).toBe(true);
    expect(isRenderableCardText("João da Conceição — Dev")).toBe(true);
    expect(isRenderableCardText("山田 太郎")).toBe(false);
    expect(isRenderableCardText("Иван Петров")).toBe(false);
    expect(isRenderableCardText("rocket 🚀")).toBe(false);
    expect(isRenderableCardText("")).toBe(false);
  });
});
