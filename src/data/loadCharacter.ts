import { buildClassExplanation, type ClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import { createRPGCharacter } from "@/game/engine";
import { analyzeLanguages } from "@/game/languages";
import type { DeveloperProfile, RPGCharacter } from "@/game/types";
import type { GitHubDataSource } from "./contracts";
import { createDataSource } from "./datasource";
import { isGameEngineV2UiEnabled } from "./datasource/config";
import { normalizeDeveloperProfile } from "./normalize";
import { validateRawGitHubData } from "./schemas";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import type { V2BackgroundScheduler, V2DeliveryResult } from "@/game-v2/delivery";
import {
  createCharacterPresentationModel,
  type CharacterPresentationModel,
} from "@/game-v2/publicProjection";
import { createProfileFingerprint, getExperimentalV2DeliveryService } from "@/game-v2/runtimeDelivery";

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

export interface LoadCharacterProductOptions {
  /** Omit for cache-only consumers such as the Hall. */
  scheduleBackground?: V2BackgroundScheduler;
}

export interface LoadedCharacterProduct {
  character: RPGCharacter;
  chronicle: DeveloperChronicle;
  classExplanation: ClassExplanation;
  presentation: CharacterPresentationModel;
}

function mockV2Result(profile: DeveloperProfile): V2DeliveryResult {
  const fixtures = {
    "veteran-dev": GOLDEN_FIXTURES.toolingBuild,
    "polyglot-dev": GOLDEN_FIXTURES.architecturalSystem,
    "popular-dev": GOLDEN_FIXTURES.devOps,
    "rookie-dev": GOLDEN_FIXTURES.newProfile,
    "empty-dev": GOLDEN_FIXTURES.emptyProfile,
  } as const;
  const fixture = fixtures[profile.username.toLowerCase() as keyof typeof fixtures] ?? GOLDEN_FIXTURES.genericReact;
  const character = createRPGCharacterV2({ profile, evidence: fixture().evidence });
  const state = character.explanation.subclass.coverage === "partial" ? "partial" : "ready";
  return { state, character, cache: "hit", source: "l1", durationMs: 0 };
}

/**
 * Product integration boundary: V1 is always built first. V2 is optional, cache-first
 * and failure-isolated; a miss can schedule enrichment but never delays the V1 result.
 */
export async function loadCharacterProduct(
  username: string,
  source: GitHubDataSource = createDataSource(),
  options: LoadCharacterProductOptions = {}
): Promise<LoadedCharacterProduct> {
  const profile = await loadProfile(username, source);
  const character = createRPGCharacter(profile);
  const base = {
    character,
    chronicle: buildDeveloperChronicle(profile),
    classExplanation: buildClassExplanation(
      character.archetype,
      analyzeLanguages(profile.languages),
      profile.languagesCoverage
    ),
  };

  if (!isGameEngineV2UiEnabled(profile.username)) {
    return { ...base, presentation: createCharacterPresentationModel(false) };
  }

  try {
    const result = source.kind === "mock"
      ? mockV2Result(profile)
      : options.scheduleBackground
        ? await getExperimentalV2DeliveryService().deliver(
            { profile, sourceFingerprint: createProfileFingerprint(profile) },
            options.scheduleBackground
          )
        : await getExperimentalV2DeliveryService().lookup({
            profile,
            sourceFingerprint: createProfileFingerprint(profile),
          });
    return {
      ...base,
      presentation: createCharacterPresentationModel(true, result),
    };
  } catch {
    return { ...base, presentation: createCharacterPresentationModel(true) };
  }
}
