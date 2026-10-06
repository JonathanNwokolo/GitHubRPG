import type { Metadata } from "next";
import { DuelTabs } from "@/features/duel/DuelTabs";
import { parseDuelUsername } from "@/features/duel/duelUrl";

export const metadata: Metadata = {
  title: "Duelo de Heróis | GitHub RPG",
  description: "Monte um duelo determinístico entre dois personagens do GitHub RPG.",
};

export default async function DuelPage({ searchParams }: { searchParams: Promise<{ opponent?: string }> }) {
  const { opponent } = await searchParams;
  let initialHeroA = "";
  if (opponent) {
    try { initialHeroA = parseDuelUsername(opponent); } catch { initialHeroA = ""; }
  }
  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12"><DuelTabs initialHeroA={initialHeroA} /></main>;
}

