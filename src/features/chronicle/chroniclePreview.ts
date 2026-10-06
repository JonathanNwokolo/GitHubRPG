import type { ChronicleRarity, ChronicleYear, DeveloperChronicle } from "./types";

/**
 * Which chapters the compact Chronicle shows before it is expanded. Pure: it only PICKS among the chapters
 * buildDeveloperChronicle already produced (it never computes or invents an event).
 *
 * Order is always chronological: the start of the journey, at most one relevant chapter in between,
 * and the current chapter. With nothing in between (or a single-year account) it shows only what exists.
 */

export const MAX_PREVIEW_ENTRIES = 3;

const RARITY_RANK: Record<ChronicleRarity, number> = { normal: 0, important: 1, exceptional: 2 };

/** A chapter in between is "relevant" when it is not a plain year: its rarity says it earned the spotlight. */
function pickIntermediate(candidates: ChronicleYear[]): ChronicleYear | null {
  let best: ChronicleYear | null = null;
  for (const year of candidates) {
    if (!year.known || year.rarity === "normal") continue;
    // `>=`: on a tie the most recent chapter wins, as it is closer to the present.
    if (best === null || RARITY_RANK[year.rarity] >= RARITY_RANK[best.rarity]) best = year;
  }
  return best;
}

export function selectPreviewYears(chronicle: DeveloperChronicle): ChronicleYear[] {
  const { years, currentChapter } = chronicle;
  const first = years.find((year) => year.isStart) ?? years[0];
  if (!first) return [currentChapter];
  if (first === currentChapter || first.year === currentChapter.year) return [first];

  const middle = pickIntermediate(years.filter((year) => year !== first && year.year !== currentChapter.year));
  return middle ? [first, middle, currentChapter] : [first, currentChapter];
}
