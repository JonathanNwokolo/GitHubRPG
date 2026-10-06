import { buildClassExplanation, type ClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import { createRPGCharacter } from "@/game/engine";
import { analyzeLanguages } from "@/game/languages";
import type { DeveloperProfile, RPGCharacter } from "@/game/types";
import type { GitHubDataSource } from "./contracts";
import { createDataSource } from "./datasource";
import { normalizeDeveloperProfile } from "./normalize";
import { validateRawGitHubData } from "./schemas";

async function loadProfile(username: string, source: GitHubDataSource): Promise<DeveloperProfile> {
  const raw = await source.getProfile(username);
  const valid = validateRawGitHubData(raw);
  return normalizeDeveloperProfile(valid);
}

/**
 * The whole pipeline, in one place:
 * GitHubDataSource -> RawGitHubData -> validation -> DeveloperProfile -> RPGCharacter.
 * The UI calls this and only presents the result.
 */
export async function loadCharacter(
  username: string,
  source: GitHubDataSource = createDataSource()
): Promise<RPGCharacter> {
  return createRPGCharacter(await loadProfile(username, source));
}

/**
 * The character plus the data derived from it for the sheet and the share cards, from ONE profile fetch
 * (the source's cache and the request count are the same as for `loadCharacter`):
 * - the Chronicle, from the same DeveloperProfile;
 * - the "Why this class?" explanation, from the engine's own archetype and language analysis.
 * Both are read-only views: they never feed back into the engine.
 */
export async function loadCharacterWithChronicle(
  username: string,
  source: GitHubDataSource = createDataSource()
): Promise<{ character: RPGCharacter; chronicle: DeveloperChronicle; classExplanation: ClassExplanation }> {
  const profile = await loadProfile(username, source);
  const character = createRPGCharacter(profile);
  return {
    character,
    chronicle: buildDeveloperChronicle(profile),
    classExplanation: buildClassExplanation(
      character.archetype,
      analyzeLanguages(profile.languages),
      profile.languagesCoverage
    ),
  };
}
