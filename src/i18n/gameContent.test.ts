import { describe, expect, it } from "vitest";
import type { AchievementProgress, ClassName, TitleProgress } from "@/game/types";
import {
  localizeAchievement,
  localizeClassName,
  localizeClassNamesInText,
  localizeTitle,
} from "./gameContent";

const milestone = {
  id: "issues-10",
  name: "Caçador de Bugs",
  description: "Abra 10 issues.",
} as AchievementProgress;

const title = {
  id: "title-stars-1000",
  name: "Lenda Celestial",
  description: "1.000+ estrelas recebidas",
} as TitleProgress;

describe("canonical V1 game content localization", () => {
  it("keeps class labels canonical in Portuguese and presents them in English", () => {
    expect(localizeClassName("Aventureiro", "pt-BR")).toBe("Aventureiro");
    expect(localizeClassName("Aventureiro", "en")).toBe("Adventurer");
    expect(localizeClassName("Bardo", "en")).toBe("Bard");
  });

  it("covers every canonical class in English", () => {
    const classes: ClassName[] = [
      "Mago", "Alquimista", "Guerreiro", "Patrulheiro", "Paladino", "Bardo",
      "Ladino", "Oráculo", "Escriba", "Sentinela", "Tecelão", "Aventureiro",
    ];
    for (const className of classes) expect(localizeClassName(className, "en")).not.toBe(className);
  });

  it("localizes canonical class names embedded in an English explanation", () => {
    expect(localizeClassNamesInText("Rust maps to Guerreiro.", "en")).toBe("Rust maps to Warrior.");
    expect(localizeClassNamesInText("Rust aponta para Guerreiro.", "pt-BR")).toBe("Rust aponta para Guerreiro.");
  });

  it("localizes achievement and milestone names and descriptions without changing ids", () => {
    expect(localizeAchievement(milestone, "pt-BR")).toBe(milestone);
    expect(localizeAchievement(milestone, "en")).toMatchObject({
      id: "issues-10",
      name: "Bug Hunter",
      description: "Open 10 issues.",
    });

    expect(localizeAchievement({ ...milestone, id: "languages-5", name: "Poliglota", description: "Use 5 linguagens relevantes." }, "en"))
      .toMatchObject({ name: "Polyglot", description: "Use 5 relevant languages." });
    expect(localizeAchievement({ ...milestone, id: "prs-25", name: "Guardião Open Source", description: "Abra 25 pull requests." }, "en"))
      .toMatchObject({ name: "Open Source Guardian", description: "Open 25 pull requests." });
  });

  it("keeps titles in Portuguese and presents titles in English", () => {
    expect(localizeTitle(title, "pt-BR")).toBe(title);
    expect(localizeTitle(title, "en")).toMatchObject({
      id: "title-stars-1000",
      name: "Celestial Legend",
      description: "1,000+ stars received",
    });
  });
});
