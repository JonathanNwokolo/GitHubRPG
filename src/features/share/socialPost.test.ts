import { describe, expect, it } from "vitest";
import { buildSharePostText, linkedInShareUrl, socialCardFilename, socialCardImagePath } from "./socialPost";

const URL = "https://githubrpg.vercel.app/jonathannwokolo";

describe("buildSharePostText", () => {
  it("PT: introduces the hero with class, level, title and the link", () => {
    expect(
      buildSharePostText({ language: "pt-BR", className: "Mago", level: 26, title: "Guardião Arcano", url: URL })
    ).toBe(
      [
        "Transformei meu perfil do GitHub em um personagem de RPG. ⚔️",
        "",
        "Classe: Mago",
        "Nível: 26",
        "Título: Guardião Arcano",
        "",
        "Veja minha ficha completa:",
        URL,
        "",
        "#GitHub #OpenSource #WebDevelopment #Programming",
      ].join("\n")
    );
  });

  it("EN: the same text in English", () => {
    expect(
      buildSharePostText({ language: "en", className: "Mage", level: 26, title: "Arcane Guardian", url: URL })
    ).toBe(
      [
        "I turned my GitHub profile into an RPG character. ⚔️",
        "",
        "Class: Mage",
        "Level: 26",
        "Title: Arcane Guardian",
        "",
        "See my full character sheet:",
        URL,
        "",
        "#GitHub #OpenSource #WebDevelopment #Programming",
      ].join("\n")
    );
  });

  it("leaves out the title when there is none", () => {
    const text = buildSharePostText({ language: "pt-BR", className: "Mago", level: 26, title: null, url: URL });
    expect(text).not.toContain("Título");
    expect(text).toContain("Nível: 26");
  });

  it("leaves out the level when it is not publishable, instead of inventing one", () => {
    const text = buildSharePostText({ language: "en", className: "Mage", level: null, title: "Arcane Guardian", url: URL });
    expect(text).not.toContain("Level");
    expect(text).toContain("Title: Arcane Guardian");
    expect(text).toContain("Class: Mage");
  });

  it("keeps the hashtags few", () => {
    const text = buildSharePostText({ language: "pt-BR", className: "Mago", level: 1, title: null, url: URL });
    expect(text.match(/#\w+/g)).toHaveLength(4);
  });
});

describe("linkedInShareUrl", () => {
  it("is the official share-offsite link, carrying only the encoded sheet URL", () => {
    expect(linkedInShareUrl(URL)).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgithubrpg.vercel.app%2Fjonathannwokolo"
    );
  });
});

describe("socialCardFilename", () => {
  it("keeps the username as written", () => {
    expect(socialCardFilename("JonathanNwokolo")).toBe("github-rpg-JonathanNwokolo.png");
    expect(socialCardFilename("octo-cat")).toBe("github-rpg-octo-cat.png");
  });

  it("reduces anything unsafe in a file name, and never produces an empty name", () => {
    expect(socialCardFilename("../../etc/passwd")).toBe("github-rpg-etc-passwd.png");
    expect(socialCardFilename('a<b>:"c"|d?.png')).toBe("github-rpg-a-b-c-d-png.png");
    expect(socialCardFilename("   ")).toBe("github-rpg-hero.png");
  });
});

describe("socialCardImagePath", () => {
  it("points at the social card route with the interface language and the equipped title", () => {
    expect(socialCardImagePath("JonathanNwokolo", "pt-BR")).toBe("/api/card/jonathannwokolo/social");
    expect(socialCardImagePath("JonathanNwokolo", "en", "title-years-5")).toBe(
      "/api/card/jonathannwokolo/social?lang=en&title=title-years-5"
    );
  });
});
