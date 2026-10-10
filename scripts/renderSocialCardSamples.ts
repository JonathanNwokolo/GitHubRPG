import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderCardImage, resolveAvatarSrc } from "@/app/api/card/cardResponse";
import { loadCardFonts, loadSocialCardArt } from "@/app/api/card/socialCardAssets";
import { buildActivityFlame } from "@/features/activity-flame/buildActivityFlame";
import { calendarOf, dayCounts } from "@/features/activity-flame/testing/fixtures";
import { SocialCardLayout } from "@/features/share/SocialCardLayout";
import { buildSocialCardContent, SOCIAL_CARD_SIZE } from "@/features/share/socialCardContent";
import { createRPGCharacter } from "@/game/createCharacter";
import type { ClassName } from "@/game/types";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { createCharacterPresentationModel } from "@/game-v2/publicProjection";
import { makeAverageProfile } from "@/test/builders";

/**
 * Renders the Hero Social Card for a handful of made-up heroes (different classes, long names, null parts), through
 * the SAME code the route runs (content builder, layout, art, fonts, renderer), to review the card by eye.
 * Not part of `npm test` or CI. Nothing here is fetched from GitHub.
 *
 *   npm run social-card:samples                      (writes to artifacts/hero-social-card)
 *   npm run social-card:samples -- some/other/dir
 */

interface Sample {
  file: string;
  username: string;
  displayName: string;
  className: ClassName;
  subclass?: ClassName;
  title: string | null;
  flame?: boolean;
  v2?: boolean;
}

const SAMPLES: Sample[] = [
  { file: "01-social-card-guido", username: "gvanrossum", displayName: "Guido van Rossum", className: "Bardo", subclass: "Guerreiro", title: "Lenda Celestial" },
  { file: "02-social-card-class-variant", username: "sindresorhus", displayName: "Sindre Sorhus", className: "Mago", subclass: "Alquimista", title: "Arcanista do Código" },
  { file: "03-social-card-long-name", username: "maximilianoalbuquerque", displayName: "Maximiliano Alexandre de Albuquerque", className: "Alquimista", subclass: "Mago", title: "Guardião Ancestral dos Repositórios" },
  { file: "extra-kent", username: "kentcdodds", displayName: "Kent C. Dodds", className: "Paladino", subclass: "Guerreiro", title: "Mestre dos Alicerces" },
  { file: "extra-seb", username: "sebmarkbage", displayName: "Sebastian Markbåge", className: "Guerreiro", subclass: "Paladino", title: "Forjador de Runas" },
  { file: "extra-null-parts", username: "torvalds", displayName: "Linus Torvalds", className: "Patrulheiro", title: null },
  { file: "extra-no-flame", username: "newhero", displayName: "Nova Heroína", className: "Aventureiro", title: null, flame: false },
  { file: "extra-v2-evolution", username: "polyglot", displayName: "Pietra Poliglota", className: "Mago", title: "Mestre dos Alicerces", v2: true },
];

/** A busy, believable year: weekday-heavy, bursts, a few quiet stretches. */
const BUSY_YEAR = dayCounts(2026, "2026-10-09", (_iso, dow, index) => {
  if (dow === 0 || dow === 6) return index % 9 === 0 ? 2 : 0;
  if (index % 17 < 3) return 0;
  return Math.round(Math.abs(Math.sin(index / 11)) * 9 + (index % 5));
});

const FLAME = buildActivityFlame({
  calendar: calendarOf({
    2025: dayCounts(2025, null, (_iso, dow, index) => (dow % 6 === 0 ? 0 : (index * 3) % 7)),
    2026: BUSY_YEAR,
  }),
  createdAt: "2012-03-01T00:00:00Z",
  referenceDate: "2026-10-09T00:00:00Z",
});

async function main(): Promise<void> {
  const outDir = path.resolve(process.argv[2] ?? "artifacts/hero-social-card");
  mkdirSync(outDir, { recursive: true });
  const fonts = await loadCardFonts();
  console.log(`fonts: ${fonts.map((font) => font.name).join(", ") || "none (fallback face)"}`);

  for (const sample of SAMPLES) {
    let character = createRPGCharacter(makeAverageProfile({ username: sample.username, displayName: sample.displayName }));
    let presentation = createCharacterPresentationModel(false);

    if (sample.v2) {
      const fixture = GOLDEN_FIXTURES.architecturalSystem();
      character = createRPGCharacter({ ...fixture.profile, username: sample.username, displayName: sample.displayName });
      presentation = createCharacterPresentationModel(true, { state: "ready", character: createRPGCharacterV2(fixture) });
    } else {
      character = {
        ...character,
        archetype: { ...character.archetype, className: sample.className, subclassName: sample.subclass },
        titles: sample.title
          ? character.titles.map((title, index) => ({ ...title, unlocked: true, name: index === 0 ? sample.title! : title.name }))
          : [],
        defaultTitleId: sample.title ? character.titles[0].id : null,
      };
    }

    const result = buildSocialCardContent({
      character,
      presentation,
      activityFlame: sample.flame === false ? undefined : FLAME,
      language: "pt-BR",
    });
    if (result.status !== "ready") {
      console.log(`${sample.file}: ${result.status}`);
      continue;
    }

    const started = performance.now();
    const [avatarSrc, art] = await Promise.all([
      resolveAvatarSrc(character),
      loadSocialCardArt("http://localhost:3000/", sample.username),
    ]);
    const response = renderCardImage(
      React.createElement(SocialCardLayout, {
        content: result.content,
        avatarSrc,
        art,
        displayUrl: `githubrpg.vercel.app/${sample.username}`,
      }),
      SOCIAL_CARD_SIZE,
      fonts
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(path.join(outDir, `${sample.file}.png`), bytes);
    console.log(`${sample.file}.png  ${Math.round(performance.now() - started)} ms  ${Math.round(bytes.length / 1024)} KB`);
  }
}

void main();
