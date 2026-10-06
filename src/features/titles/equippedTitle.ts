import type { TitleProgress } from "@/game/types";

/**
 * The title to show: the user's saved pick if it still exists and is unlocked,
 * otherwise the engine's default (or none). Only one title is ever equipped.
 */
export function resolveEquippedTitle(
  titles: readonly TitleProgress[],
  savedTitleId: string | undefined,
  defaultTitleId: string | null
): TitleProgress | null {
  const saved = savedTitleId ? titles.find((t) => t.id === savedTitleId) : undefined;
  if (saved?.unlocked) return saved;
  const fallback = defaultTitleId ? titles.find((t) => t.id === defaultTitleId) : undefined;
  return fallback?.unlocked ? fallback : null;
}
