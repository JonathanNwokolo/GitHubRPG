import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RpgClassIcon } from "@/design-system/icons/RpgClassIcons";
import type { ClassName } from "@/game/types";
import {
  fitName,
  SocialCardLayout,
  SOCIAL_FLAME_PALETTE,
  type SocialCardArt,
} from "./SocialCardLayout";
import type { SocialCardContent } from "./socialCardContent";

const ART: SocialCardArt = { frame: null, plate: "data:image/png;base64,AA==", divider: null, backdrop: null };

const ALL_CLASSES: ClassName[] = [
  "Mago",
  "Alquimista",
  "Guerreiro",
  "Patrulheiro",
  "Paladino",
  "Bardo",
  "Ladino",
  "Oráculo",
  "Escriba",
  "Sentinela",
  "Tecelão",
  "Aventureiro",
];

function content(overrides: Partial<SocialCardContent> = {}): SocialCardContent {
  return {
    language: "pt-BR",
    username: "gvanrossum",
    displayName: "Guido van Rossum",
    title: "Lenda Celestial",
    className: "Bardo",
    classIcon: "Bardo",
    subclassIcon: "Guerreiro",
    subclassName: "Guerreiro",
    evolutionName: "Ascendente Arcano",
    level: 45,
    tier: "Veterano",
    affinities: [{ name: "TypeScript", share: "55%" }],
    flame: {
      year: 2026,
      inProgress: true,
      levels: Array.from({ length: 60 }, (_, index) => (index % 6) as 0 | 1 | 2 | 3 | 4 | 5),
      startDow: 4,
      firstDayIndex: 0,
      metrics: [
        { id: "contributions", label: "Contribuições", value: "1.295" },
        { id: "longestStreak", label: "Maior sequência", value: "6 dias" },
        { id: "activeDays", label: "Dias ativos", value: "174" },
      ],
    },
    texts: {
      kicker: "CARTA SOCIAL DO HERÓI",
      level: "NÍVEL",
      affinities: "AFINIDADES",
      evolution: "Evolução",
      flame: "CHAMA DA ATIVIDADE",
      flameInProgress: "ano em andamento",
      disclaimer: "Gamificação a partir de dados públicos do GitHub.",
    },
    ...overrides,
  };
}

/** The layout as markup (the renderer's own element tree, without drawing it). */
function markup(overrides: Partial<SocialCardContent> = {}, art: SocialCardArt = ART): string {
  return renderToStaticMarkup(
    <SocialCardLayout content={content(overrides)} avatarSrc="data:image/png;base64,AA==" art={art} displayUrl="githubrpg.vercel.app/gvanrossum" />
  );
}

/** The drawing inside an <svg>, without its size attributes: the same insignia at any size matches. */
function glyphOf(classNameType: ClassName): string {
  const svg = renderToStaticMarkup(<RpgClassIcon classNameType={classNameType} size={10} />);
  return svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
}

describe("the card's flame palette", () => {
  it("is the Activity Flame palette of the sheet (activity-flame.css), level by level", () => {
    const css = readFileSync(path.join(process.cwd(), "src/features/activity-flame/activity-flame.css"), "utf8");
    const declared = [0, 1, 2, 3, 4, 5].map((level) => {
      const match = css.match(new RegExp(`--af-l${level}:\\s*(#[0-9a-fA-F]{6})`));
      return match?.[1].toLowerCase();
    });
    expect(declared).toEqual([...SOCIAL_FLAME_PALETTE]);
  });
});

describe("SocialCardLayout: identity block", () => {
  it("shows name, username, title, class, subclass, evolution, level and tier", () => {
    const html = markup();
    for (const text of ["Guido van", "Rossum", "@gvanrossum", "Lenda Celestial", "Bardo", "Guerreiro", "Evolução: Ascendente Arcano", "45", "Veterano", "NÍVEL"]) {
      expect(html).toContain(text);
    }
  });

  it("wears the sheet's insignia for every class (the same RpgClassIcon mapping, nothing hardcoded)", () => {
    for (const className of ALL_CLASSES) {
      const html = markup({ className, classIcon: className, subclassName: null, subclassIcon: null, evolutionName: null });
      expect(html, className).toContain(glyphOf(className));
    }
  });

  it("wears the subclass insignia too (V1), and none when there is no subclass icon (V2 specialization)", () => {
    const withIcon = markup({ classIcon: "Mago", subclassIcon: "Guerreiro", subclassName: "Guerreiro", evolutionName: null });
    expect(withIcon).toContain(glyphOf("Mago"));
    expect(withIcon).toContain(glyphOf("Guerreiro"));

    const v2 = markup({ classIcon: "Mago", subclassIcon: null, subclassName: "Arquiteto", evolutionName: null });
    expect(v2).toContain("Arquiteto");
    expect(v2).not.toContain(glyphOf("Guerreiro"));
  });

  it("recomposes without holes when the title, subclass and evolution are null", () => {
    const html = markup({ title: null, subclassName: null, subclassIcon: null, evolutionName: null });
    expect(html).not.toContain("«");
    expect(html).not.toContain("Guerreiro");
    expect(html).not.toContain("Evolução");
    expect(html).toContain("Bardo");
    expect(html).toContain("45");
  });

  it("puts the level in a block of its own, never absolutely positioned over the avatar", () => {
    const html = markup();
    const levelAt = html.indexOf("NÍVEL");
    expect(levelAt).toBeGreaterThan(-1);
    // The plate is a normal-flow child of the hero column: the markup between the avatar image and the label
    // has no negative margin and no transform that would pull it back over the portrait.
    expect(html).not.toMatch(/margin-top:\s*-/);
  });

  it("uses the sheet's families: Press Start 2P for the name and the level, Inter for labels", () => {
    const html = markup();
    expect(html).toContain("Press Start 2P");
    expect(html).toContain("Inter");
  });

  it("has no flame panel without a calendar", () => {
    const html = markup({ flame: null });
    expect(html).not.toContain("CHAMA DA ATIVIDADE");
    expect(html).toContain("AFINIDADES");
  });
});

describe("fitName", () => {
  const COLUMN = 512;

  it("breaks a two-word name on purpose, the lines as even as the words allow", () => {
    expect(fitName("Guido van Rossum", COLUMN).lines).toEqual(["Guido van", "Rossum"]);
    expect(fitName("Kent C. Dodds", COLUMN).lines).toEqual(["Kent C.", "Dodds"]);
    expect(fitName("Sebastian Markbåge", COLUMN).lines).toEqual(["Sebastian", "Markbåge"]);
  });

  it("keeps a short name on one line at the largest size", () => {
    expect(fitName("Guido", COLUMN)).toEqual({ size: 44, lines: ["Guido"] });
  });

  it("shrinks a long single word until it fits, and never exceeds two lines", () => {
    const username = fitName("sindresorhus", COLUMN);
    expect(username.lines).toEqual(["sindresorhus"]);
    expect(username.size * "sindresorhus".length).toBeLessThanOrEqual(COLUMN);

    const long = fitName("Maximiliano Alexandre de Albuquerque Cavalcanti", COLUMN);
    expect(long.lines.length).toBeLessThanOrEqual(2);
    for (const line of long.lines) expect(line.length * long.size).toBeLessThanOrEqual(COLUMN);
  });

  it("clips what cannot fit instead of overflowing the card", () => {
    const huge = fitName("A".repeat(80), COLUMN);
    expect(huge.lines.length).toBeLessThanOrEqual(2);
    for (const line of huge.lines) expect(line.length * huge.size).toBeLessThanOrEqual(COLUMN);
    expect(huge.size).toBeGreaterThanOrEqual(20);
  });
});
