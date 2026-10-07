import { createHash } from "node:crypto";
import { readDataSourceConfig } from "@/data/datasource/config";
import type { DeveloperProfile } from "@/game/types";
import { InMemoryEvidenceCache, MultiLayerEvidenceCache } from "./cache";
import { V2DeliveryService } from "./delivery";
import { VercelRuntimeEvidenceCache } from "./runtimeCache";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "./types";

function isCharacter(value: unknown): value is RPGCharacterV2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RPGCharacterV2>;
  return candidate.engineVersion === "2.0-experimental-v24-evo"
    && candidate.schemaVersion === "game-engine-v2-schema-2"
    && typeof candidate.identity === "object"
    && candidate.identity !== null
    && typeof candidate.explanation === "object"
    && candidate.explanation !== null;
}

export function createProfileFingerprint(profile: DeveloperProfile): string {
  const { referenceDate: _referenceDate, ...stableProfile } = profile;
  return createHash("sha256").update(JSON.stringify(stableProfile)).digest("hex");
}

let singleton: V2DeliveryService | null = null;

export function getExperimentalV2DeliveryService(): V2DeliveryService {
  if (singleton) return singleton;
  // Frozen-cohort measurement found normalized evidence above the 2 MB provider limit.
  // Keep evidence local instead of truncating or splitting it silently; final characters are the shared delivery object.
  const evidenceCache = new InMemoryEvidenceCache<TechnologyEvidenceProfile>();
  const characterCache = new MultiLayerEvidenceCache(
    new InMemoryEvidenceCache<RPGCharacterV2>(),
    new VercelRuntimeEvidenceCache({ kind: "character", isValue: isCharacter })
  );
  singleton = new V2DeliveryService({
    evidenceCache,
    characterCache,
    collectorOptions: { token: readDataSourceConfig().githubToken },
  });
  return singleton;
}
