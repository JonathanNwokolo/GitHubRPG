import { describe, expect, it } from "vitest";
import { profileUrl } from "@/lib/profileUrl";
import { describeShareTarget, shareCardFilename, shareCardImagePath, type ShareTarget } from "./shareTarget";

const achievement: ShareTarget = { kind: "achievement", id: "age-5", name: "Antigo Guardião" };
const chapter: ShareTarget = { kind: "chronicle", year: 2025, title: "O Grande Avanço" };

describe("share card file names", () => {
  it("follows github-rpg-{username}-{kind}-{id}.png", () => {
    expect(shareCardFilename("octocat", achievement)).toBe("github-rpg-octocat-achievement-age-5.png");
    expect(shareCardFilename("octocat", chapter)).toBe("github-rpg-octocat-chronicle-2025.png");
  });

  it("lower-cases the username and strips anything that is not safe in a file name", () => {
    expect(shareCardFilename("Octo-Cat", achievement)).toBe("github-rpg-octo-cat-achievement-age-5.png");
    const hostile = shareCardFilename(`..\\..\\evil/"name"<>:*?|`, { kind: "achievement", id: "../x y", name: "n" });
    expect(hostile).toMatch(/^github-rpg-[a-z0-9-]+-achievement-[a-z0-9-]+\.png$/);
    expect(hostile).not.toMatch(/[\\/:*?"<>|\s]/);
  });

  it("never produces an empty segment", () => {
    expect(shareCardFilename("???", { kind: "achievement", id: "***", name: "n" })).toBe("github-rpg-x-achievement-x.png");
  });
});

describe("share card image paths", () => {
  it("point at the validated card routes", () => {
    expect(shareCardImagePath("Octocat", achievement, "pt-BR")).toBe("/api/card/octocat/achievement/age-5");
    expect(shareCardImagePath("octocat", chapter, "pt-BR")).toBe("/api/card/octocat/chronicle/2025");
  });

  it("carry the language as a closed switch, nothing else", () => {
    expect(shareCardImagePath("octocat", achievement, "en")).toBe("/api/card/octocat/achievement/age-5?lang=en");
    expect(shareCardImagePath("octocat", chapter, "en")).toBe("/api/card/octocat/chronicle/2025?lang=en");
  });

  it("encode the id so it cannot change the path", () => {
    expect(shareCardImagePath("octocat", { kind: "achievement", id: "a/b?c=d", name: "n" }, "pt-BR")).toBe(
      "/api/card/octocat/achievement/a%2Fb%3Fc%3Dd"
    );
  });
});

describe("share texts", () => {
  it("share the profile link in both languages (V1 has no per-achievement URL)", () => {
    for (const language of ["pt-BR", "en"] as const) {
      expect(describeShareTarget("octocat", achievement, language).data.url).toBe(profileUrl("octocat"));
      expect(describeShareTarget("octocat", chapter, language).data.url).toBe(profileUrl("octocat"));
    }
  });

  it("speaks about the achievement in pt-BR", () => {
    const texts = describeShareTarget("octocat", achievement, "pt-BR");
    expect(texts.dialogTitle).toBe("Compartilhar conquista");
    expect(texts.data.title).toBe("Antigo Guardião — GitHub RPG");
    expect(texts.data.text).toBe("octocat desbloqueou a conquista Antigo Guardião no GitHub RPG.");
    expect(texts.previewLabel).toBe("Pré-visualização do cartão da conquista Antigo Guardião");
  });

  it("speaks about the chapter in English", () => {
    const texts = describeShareTarget("octocat", chapter, "en");
    expect(texts.dialogTitle).toBe("Share chapter");
    expect(texts.data.title).toBe("2025: O Grande Avanço — GitHub RPG");
    expect(texts.data.text).toBe("Chapter 2025 of octocat's journey on GitHub RPG: O Grande Avanço.");
    expect(texts.previewLabel).toBe("Preview of the 2025 chapter card");
  });
});
