import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvalidUsernameError } from "@/data/github/errors";
import { DuelArena } from "@/features/duel/DuelArena";
import { DuelTabs } from "@/features/duel/DuelTabs";
import { parseDuelUsername } from "@/features/duel/duelUrl";
import { buildDuelMetadata } from "@/lib/seo";

interface DuelPageProps { params: Promise<{ heroA: string; heroB: string }> }

function decoded(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function generateMetadata({ params }: DuelPageProps): Promise<Metadata> {
  const { heroA, heroB } = await params;
  return buildDuelMetadata(decoded(heroA), decoded(heroB));
}

export default async function DuelResultPage({ params }: DuelPageProps) {
  const values = await params;
  try {
    const heroA = parseDuelUsername(decoded(values.heroA));
    const heroB = parseDuelUsername(decoded(values.heroB));
    if (heroA.toLowerCase() === heroB.toLowerCase()) notFound();
    return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12"><DuelTabs initialHeroA={heroA} arena={<DuelArena heroA={heroA} heroB={heroB} />} /></main>;
  } catch (error) {
    if (error instanceof InvalidUsernameError) notFound();
    throw error;
  }
}

