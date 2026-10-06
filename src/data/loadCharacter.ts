import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import { createRPGCharacter } from "@/game/engine";
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
 * The character plus its Chronicle, from ONE profile fetch (the source's cache and the request count are
 * the same as for `loadCharacter`). The Chronicle is derived from the same DeveloperProfile and never feeds
 * back into the engine.
 */
export async function loadCharacterWithChronicle(
  username: string,
  source: GitHubDataSource = createDataSource()
): Promise<{ character: RPGCharacter; chronicle: DeveloperChronicle }> {
  const profile = await loadProfile(username, source);
  return { character: createRPGCharacter(profile), chronicle: buildDeveloperChronicle(profile) };
}
