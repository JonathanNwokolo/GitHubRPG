export const HERO_CATEGORY_IDS = ["legends", "brazil", "web", "guardians"] as const;

export type HeroCategoryId = (typeof HERO_CATEGORY_IDS)[number];

export interface FeaturedHeroCategory {
  id: HeroCategoryId;
  usernames: readonly string[];
}

/** Editorial membership only. The Hall orders the loaded subset with its local category score. */
export const FEATURED_HERO_CATEGORIES: readonly FeaturedHeroCategory[] = [
  {
    id: "legends",
    usernames: ["torvalds", "gvanrossum", "matz", "antirez", "dhh", "sindresorhus"],
  },
  {
    id: "brazil",
    usernames: ["filipedeschamps", "diego3g", "maykbrito", "loiane", "beatrizmilz", "omariosouto"],
  },
  {
    id: "web",
    usernames: ["ahejlsberg", "segunadebayo", "emilkowalski", "iamkun", "pacocoursey"],
  },
  {
    id: "guardians",
    usernames: ["torvalds", "dhh", "antirez", "matz", "gvanrossum", "tj"],
  },
] as const;

export const HEROES_PER_CATEGORY = 5;

/**
 * How long /api/heroes waits for the profiles before answering with the ones already loaded. Measured cold
 * profiles take 2 s to 48 s (sequential GraphQL pages), so the slowest one must not hold the landing.
 */
export const HEROES_RESPONSE_BUDGET_MS = 7_000;

export function isHeroCategoryId(value: string | null): value is HeroCategoryId {
  return HERO_CATEGORY_IDS.includes(value as HeroCategoryId);
}

export function getHeroCategory(id: HeroCategoryId): FeaturedHeroCategory {
  return FEATURED_HERO_CATEGORIES.find((category) => category.id === id)!;
}
