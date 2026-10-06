import type { HeroesResponse } from "@/features/heroes/heroSummary";
import type { HeroCategoryId } from "@/features/heroes/featuredHeroes";

export async function fetchHeroes(category: HeroCategoryId, signal?: AbortSignal): Promise<HeroesResponse> {
  const response = await fetch(`/api/heroes?category=${encodeURIComponent(category)}`, { signal });
  if (!response.ok) throw new Error("heroes_unavailable");
  return (await response.json()) as HeroesResponse;
}
