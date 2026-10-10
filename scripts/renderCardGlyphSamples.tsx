import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderCardImage } from "@/app/api/card/cardResponse";
import { AchievementCardLayout } from "@/features/share/AchievementCardLayout";
import { ChronicleCardLayout } from "@/features/share/ChronicleCardLayout";
import { formatCardLowerBound } from "@/features/share/cardContent";

const OUT_DIR = path.resolve("artifacts/technical-debt");
const AVATAR =
  "data:image/svg+xml;base64," +
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#111827"/><circle cx="90" cy="70" r="36" fill="#d97706"/><path d="M30 180c5-48 30-72 60-72s55 24 60 72" fill="#f59e0b"/></svg>').toString("base64");

async function writeCard(file: string, element: React.ReactElement): Promise<void> {
  const response = renderCardImage(element);
  writeFileSync(path.join(OUT_DIR, file), Buffer.from(await response.arrayBuffer()));
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  await writeCard(
    "achievement-card-without-tofu.png",
    <AchievementCardLayout
      username="partial-hero"
      displayName="Heroína Parcial"
      avatarSrc={AVATAR}
      host="githubrpg.vercel.app"
      texts={{ kicker: "CONQUISTA DESBLOQUEADA", rarityLabel: "Épica", cta: "Transforme seu GitHub em um personagem RPG." }}
      achievement={{
        name: "Mestre dos Commits",
        description: "Marco confirmado no histórico conhecido.",
        rarity: "epic",
        progress: formatCardLowerBound("≥ 1.500 commits"),
      }}
    />
  );

  await writeCard(
    "chronicle-card-without-tofu.png",
    <ChronicleCardLayout
      username="partial-hero"
      displayName="Heroína Parcial"
      avatarSrc={AVATAR}
      host="githubrpg.vercel.app"
      texts={{ kicker: "CAPÍTULO DA CRÔNICA", cta: "Transforme seu GitHub em um personagem RPG." }}
      chapter={{
        year: 2025,
        title: "O Grande Avanço",
        description: "O período mais ativo do histórico conhecido.",
        metrics: [formatCardLowerBound("≥ 1.300 contribuições"), formatCardLowerBound("≥ 521 commits")],
        note: "Os valores representam limites inferiores confirmados.",
      }}
    />
  );
}

void main();
