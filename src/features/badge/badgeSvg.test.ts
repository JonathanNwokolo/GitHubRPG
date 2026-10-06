import { describe, expect, it } from "vitest";
import { createRPGCharacter } from "@/game/createCharacter";
import { makeAverageProfile } from "@/test/builders";
import { badgeClassLabel, badgeDescription, buildBadgeSvg, escapeXml } from "./badgeSvg";

function parse(svg: string): Document {
  return new DOMParser().parseFromString(svg, "image/svg+xml");
}

const ALLOWED_ELEMENTS = new Set(["svg", "title", "rect", "polygon", "g", "text"]);

describe("escapeXml", () => {
  it("escapes the five XML special characters", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("escapes & first, so an existing entity is not decoded by accident", () => {
    expect(escapeXml("&lt;")).toBe("&amp;lt;");
  });

  it("drops control characters that XML 1.0 forbids", () => {
    expect(escapeXml("a\u0000b\u0008c\u000Bd\u001Fe")).toBe("abcde");
    expect(escapeXml("tab\tnew\nline")).toBe("tab\tnew\nline");
  });

  it("keeps ordinary text, accents included", () => {
    expect(escapeXml("Oráculo / Tecelão")).toBe("Oráculo / Tecelão");
  });
});

describe("buildBadgeSvg", () => {
  const input = { username: "octocat", level: 24, className: "Mago", subclassName: "Bardo" };

  it("is a well-formed SVG with an accessible name", () => {
    const doc = parse(buildBadgeSvg(input));

    expect(doc.querySelector("parsererror")).toBeNull();
    const svg = doc.documentElement;
    expect(svg.tagName).toBe("svg");
    expect(svg.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("GitHub RPG: @octocat, LV.24, Mago / Bardo");
    expect(doc.querySelector("title")?.textContent).toBe("GitHub RPG: @octocat, LV.24, Mago / Bardo");
    expect(Number(svg.getAttribute("width"))).toBeGreaterThan(100);
    expect(svg.getAttribute("height")).toBe("26");
  });

  it("shows the brand, the level, the class and the subclass", () => {
    const texts = [...parse(buildBadgeSvg(input)).querySelectorAll("text")].map((node) => node.textContent);
    expect(texts).toEqual(["GITHUB RPG", "LV.24", "Mago / Bardo"]);
  });

  it("shows only the class when there is no subclass", () => {
    const texts = [...parse(buildBadgeSvg({ ...input, subclassName: undefined })).querySelectorAll("text")].map(
      (node) => node.textContent
    );
    expect(texts).toEqual(["GITHUB RPG", "LV.24", "Mago"]);
  });

  it("is deterministic: the same input gives the same bytes", () => {
    expect(buildBadgeSvg(input)).toBe(buildBadgeSvg({ ...input }));
  });

  it("is small (README badges are fetched constantly)", () => {
    expect(new TextEncoder().encode(buildBadgeSvg(input)).length).toBeLessThan(2_000);
  });

  it("is wider with a subclass than without", () => {
    const width = (svg: string) => Number(parse(svg).documentElement.getAttribute("width"));
    expect(width(buildBadgeSvg(input))).toBeGreaterThan(width(buildBadgeSvg({ ...input, subclassName: undefined })));
  });

  it("never prints NaN or a level below 1", () => {
    expect(buildBadgeSvg({ ...input, level: Number.NaN })).toContain("LV.1");
    expect(buildBadgeSvg({ ...input, level: -4 })).toContain("LV.1");
    expect(buildBadgeSvg({ ...input, level: 24.9 })).toContain("LV.24");
    expect(buildBadgeSvg({ ...input, level: 24 })).not.toContain("NaN");
  });

  it("level and class come from the real engine result", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const svg = buildBadgeSvg({
      username: character.identity.username,
      level: character.progression.level,
      className: character.archetype.className,
      subclassName: character.archetype.subclassName,
    });

    expect(svg).toContain(`LV.${character.progression.level}`);
    expect(svg).toContain(badgeClassLabel(character.archetype.className, character.archetype.subclassName));
  });

  it("describes itself the way the aria-label does", () => {
    expect(badgeDescription(input)).toBe("GitHub RPG: @octocat, LV.24, Mago / Bardo");
  });
});

describe("buildBadgeSvg: SVG injection", () => {
  const PAYLOADS = [
    `"><script>alert(1)</script>`,
    `</text><script>alert(1)</script><text>`,
    `<foreignObject><iframe src="https://evil.example"></iframe></foreignObject>`,
    `" onload="alert(1)`,
    `' onmouseover='alert(1)`,
    `<image href="https://evil.example/x.png"/>`,
    `]]><script>alert(1)</script>`,
    `&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;`,
    `<a xlink:href="javascript:alert(1)">x</a>`,
    `\u0000<script>`,
  ];

  for (const [index, payload] of PAYLOADS.entries()) {
    it(`neutralises payload ${index + 1} in every user-derived field`, () => {
      const svg = buildBadgeSvg({ username: payload, level: 7, className: payload, subclassName: payload });
      const doc = parse(svg);

      // Still well formed, and made of nothing but the fixed template's elements.
      expect(doc.querySelector("parsererror")).toBeNull();
      const elements = [...doc.querySelectorAll("*")].map((node) => node.tagName);
      expect(elements.every((name) => ALLOWED_ELEMENTS.has(name))).toBe(true);

      // No script, no foreignObject, no event handler, no link: nothing the payload said became markup.
      expect(doc.querySelector("script, foreignObject, iframe, image, a")).toBeNull();
      const attributeNames = [...doc.querySelectorAll("*")].flatMap((node) => node.getAttributeNames());
      expect(attributeNames.some((name) => /^on/i.test(name) || /href/i.test(name))).toBe(false);

      // The raw markup characters of the payload never appear unescaped.
      expect(svg).not.toMatch(/<script|<foreignObject|<iframe|<image|<a[\s>]/i);
    });
  }

  it("the template itself carries no script, no foreignObject, no event handler and no external URL", () => {
    const svg = buildBadgeSvg({ username: "octocat", level: 3, className: "Mago" });

    expect(svg).not.toMatch(/<script|foreignObject|\son\w+=|javascript:|<style|<image|<use|<a[\s>]/i);
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
    expect(svg).not.toMatch(/url\(/);
  });

  it("an escaped payload survives as plain text, not as markup", () => {
    const doc = parse(buildBadgeSvg({ username: "x", level: 1, className: `<b>"Mago"&</b>` }));
    const classText = [...doc.querySelectorAll("text")][2].textContent;
    expect(classText).toBe(`<b>"Mago"&</b>`);
  });
});
