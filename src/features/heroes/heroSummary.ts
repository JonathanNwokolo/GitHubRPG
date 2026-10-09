import type { ClassName, RPGCharacter } from "@/game/types";
import type { CharacterPresentationModel } from "@/game-v2/publicProjection";
import type { LocalizedText } from "@/game-v2/types";
import type { HeroCategoryId } from "./featuredHeroes";

export interface HeroSummary {
  username: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  className: ClassName;
  subclassName?: ClassName;
  subclassV2?: LocalizedText;
  evolutionV2?: LocalizedText;
  dominantLanguage?: string;
  title?: string;
  titleId?: string;
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
export function toHeroSummary(character: RPGCharacter, presentation?: CharacterPresentationModel): HeroSummary {
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
    ...(presentation?.v2?.identity.subclass ? { subclassV2: presentation.v2.identity.subclass.name } : {}),
    ...(presentation?.v2?.identity.evolution ? { evolutionV2: presentation.v2.identity.evolution.name } : {}),
    ...(character.archetype.dominantLanguage ? { dominantLanguage: character.archetype.dominantLanguage } : {}),
    ...(title ? { title: title.name, titleId: title.id } : {}),
    starsReceived: character.summary.starsReceived.value,
  };
}
