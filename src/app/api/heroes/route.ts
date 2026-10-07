import { after, NextResponse } from "next/server";
import { createDataSource } from "@/data/datasource";
import { loadCharacterProduct } from "@/data/loadCharacter";
import { collectWithinBudget } from "@/features/heroes/collectWithinBudget";
import {
  getHeroCategory,
  HEROES_PER_CATEGORY,
  HEROES_RESPONSE_BUDGET_MS,
  isHeroCategoryId,
} from "@/features/heroes/featuredHeroes";
import { toHeroSummary, type HeroSummary, type HeroesResponse } from "@/features/heroes/heroSummary";

export const dynamic = "force-dynamic";

/** Only a complete category is shared by the CDN; partial and empty answers must be recomputed next time. */
const COMPLETE_CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=300";
const INCOMPLETE_CACHE_CONTROL = "no-store";

export async function GET(request: Request) {
  const categoryId = new URL(request.url).searchParams.get("category");
  if (!isHeroCategoryId(categoryId)) {
    return NextResponse.json(
      { error: { code: "invalid_category", message: "Categoria de heróis inválida." } },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const usernames = getHeroCategory(categoryId).usernames.slice(0, HEROES_PER_CATEGORY);
  const source = createDataSource();
  const { slots, settled, pending } = await collectWithinBudget(
    usernames.map((username) => loadCharacterProduct(username, source)),
    HEROES_RESPONSE_BUDGET_MS
  );

  // Profiles that are still loading are not abandoned: `after` keeps the invocation alive (waitUntil on Vercel)
  // so they finish and fill this instance's cache. Other instances do not share it.
  if (pending > 0) after(settled);

  const heroes = slots.flatMap<HeroSummary>((slot) => (
    slot.status === "fulfilled" ? [toHeroSummary(slot.value.character, slot.value.presentation)] : []
  ));
  const failed = slots.filter((slot) => slot.status === "rejected").length;
  const response: HeroesResponse = {
    category: categoryId,
    heroes,
    requested: usernames.length,
    failed,
    pending,
    partial: failed + pending > 0,
  };

  const complete = !response.partial && heroes.length > 0;
  return NextResponse.json(response, {
    headers: { "Cache-Control": complete ? COMPLETE_CACHE_CONTROL : INCOMPLETE_CACHE_CONTROL },
  });
}
