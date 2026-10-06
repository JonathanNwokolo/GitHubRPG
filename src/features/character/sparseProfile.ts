import type { RPGCharacter } from "@/game/types";

/**
 * True when the profile has nothing public to build a sheet from: no own repositories, no languages and
 * no commits found. Presentation only (it picks whether to show an explanation); it changes no number.
 */
export function hasSparsePublicData(character: RPGCharacter): boolean {
  const { ownRepositories, commits } = character.summary;
  return ownRepositories.value === 0 && commits.value === 0 && character.skills.length === 0;
}
