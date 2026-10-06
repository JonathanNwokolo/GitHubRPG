import type { ClassName, RPGCharacter } from "@/game/types";
import type { HeroCategoryId } from "./featuredHeroes";

export interface HeroSummary {
  username: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  className: ClassName;
  subclassName?: ClassName;
  dominantLanguage?: string;
  title?: string;
  starsReceived: number;
}

export interface HeroesResponse {
  category: HeroCategoryId;
  heroes: HeroSummary[];
  requested: number;
  /** Profiles that finished with an error. */
  failed: number;
  /** Profiles still loading when the response budget ended; they keep loading and warm the cache. */
  pending: number;
  /** True when `heroes` is not the whole category (failed + pending > 0). */
  partial: boolean;
}

/** Project only what the landing renders; engine output remains the sole source of RPG facts. */
export function toHeroSummary(character: RPGCharacter): HeroSummary {
  const title = character.defaultTitleId
    ? character.titles.find((candidate) => candidate.id === character.defaultTitleId && candidate.unlocked)
    : undefined;

  return {
    username: character.identity.username,
    displayName: character.identity.displayName || character.identity.username,
    ...(character.identity.avatarUrl ? { avatarUrl: character.identity.avatarUrl } : {}),
    level: character.progression.level,
    className: character.archetype.className,
    ...(character.archetype.subclassName ? { subclassName: character.archetype.subclassName } : {}),
    ...(character.archetype.dominantLanguage ? { dominantLanguage: character.archetype.dominantLanguage } : {}),
    ...(title ? { title: title.name } : {}),
    starsReceived: character.summary.starsReceived.value,
  };
}
