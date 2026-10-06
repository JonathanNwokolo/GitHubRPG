import { createRPGCharacter } from "@/game/engine";
import type { RPGCharacter } from "@/game/types";
import type { GitHubDataSource } from "./contracts";
import { createDataSource } from "./datasource";
import { normalizeDeveloperProfile } from "./normalize";
import { validateRawGitHubData } from "./schemas";

/**
 * The whole pipeline, in one place:
 * GitHubDataSource -> RawGitHubData -> validation -> DeveloperProfile -> RPGCharacter.
 * The UI calls this and only presents the result.
 */
export async function loadCharacter(
  username: string,
  source: GitHubDataSource = createDataSource()
): Promise<RPGCharacter> {
  const raw = await source.getProfile(username);
  const valid = validateRawGitHubData(raw);
  const profile = normalizeDeveloperProfile(valid);
  return createRPGCharacter(profile);
}
