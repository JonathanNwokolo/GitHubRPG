import type { ChronicleYear, DeveloperChronicle } from "./types";

/**
 * Which Chronicle chapters can become a share card. A chapter is identified by its calendar year
 * (stable, public and already unique inside one chronicle), so a card URL carries no free text.
 *
 * Shareable: the opening chapter, the current chapter, and every chapter the Chronicle itself rates above
 * "normal" (most active year, records, comeback, streak, milestone, growth). The quiet and minor ones stay
 * out: a card about "a calmer pace" is not something people want to post.
 */
export function isShareableChapter(entry: ChronicleYear): boolean {
  return entry.isStart || entry.isCurrent || entry.rarity !== "normal";
}

export function shareableChapters(chronicle: DeveloperChronicle): ChronicleYear[] {
  return chronicle.years.filter(isShareableChapter);
}

/** A year in the URL: exactly four digits. */
const YEAR_PATTERN = /^\d{4}$/;

export function parseChapterYear(raw: string): number | null {
  return YEAR_PATTERN.test(raw) ? Number(raw) : null;
}

/** The shareable chapter of `year` in THIS chronicle, or undefined: an event that is not in it cannot get a card. */
export function findShareableChapter(chronicle: DeveloperChronicle, year: number): ChronicleYear | undefined {
  return shareableChapters(chronicle).find((entry) => entry.year === year);
}
