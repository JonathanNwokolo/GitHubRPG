import type { ClassName, DeveloperProfile, RPGCharacter } from "@/game/types";

export type CoverageState = "full" | "partial" | "unavailable";
export type ConfidenceLevel = "low" | "medium" | "high" | "unavailable";
export type DecisionStatus = "strong" | "possible" | "insufficient" | "unavailable";
export type PracticeArchetype = "architect" | "artificer" | "illusionist" | "guardian" | "chronomancer";
export type TechnologyKind = "affinity" | "school" | "artifact";
export type RarityV2 = "common" | "rare" | "epic" | "legendary" | "mythic";
export type Locale = "pt-BR" | "en";

export interface LocalizedText { pt: string; en: string }

export type EvidenceSourceKind =
  | "manifest"
  | "directDependency"
  | "peerDependency"
  | "devDependency"
  | "config"
  | "lockCorroboration"
  | "metric";

export interface EvidenceItem {
  repoId: string;
  repoName: string;
  itemId: string;
  itemKind: TechnologyKind;
  sourcePath: string;
  sourceKind: EvidenceSourceKind;
  strength: number;
  observedAt: string;
  detectorVersion: string;
  direct: boolean;
}

export interface RepositorySourceFile {
  path: string;
  content: string;
  blobSha?: string;
  projectId?: string;
  contextWeight?: number;
}

export interface ProjectEvidence {
  id: string;
  root: string;
  manifestPaths: string[];
}

export interface RawRepositoryEvidence {
  id: string;
  name: string;
  isFork: boolean;
  isArchived: boolean;
  isEmpty: boolean;
  stars: number;
  pushedAt: string;
  languages: Record<string, number>;
  files: RepositorySourceFile[];
  size?: number;
  primaryLanguage?: string | null;
  projects?: ProjectEvidence[];
}

export interface CollectionCoverage {
  coverage: CoverageState;
  eligible: number;
  examined: number;
  failed: number;
  omittedByBudget: number;
  reposCandidates?: number;
  treesDiscovered?: number;
  treesTruncated?: number;
  manifestsDiscovered?: number;
  manifestsFetched?: number;
  manifestsSkippedByBudget?: number;
  uncertainRepositories?: number;
  gap?: "none" | "small" | "large";
  domains?: {
    language: CoverageState;
    school: CoverageState;
    artifact: CoverageState;
  };
}

export interface RequestAccounting {
  rest: number;
  graphql: number;
  manifestFetches: number;
  reposInspected: number;
  cacheHits: number;
  treeRequests?: number;
  manifestRequests?: number;
  fallbackRequests?: number;
  treeCacheHits?: number;
  manifestCacheHits?: number;
  manifestsDiscovered?: number;
  manifestsSkippedByBudget?: number;
  projectsDiscovered?: number;
  rateLimitRemaining?: number | null;
  timingsMs?: {
    repositorySelection: number;
    treeDiscovery: number;
    manifestFetch: number;
    parsing: number;
    engineScoring?: number;
  };
}

export interface RawEvidenceCollection {
  repositories: RawRepositoryEvidence[];
  coverage: CollectionCoverage;
  requests: RequestAccounting;
}

export interface TechnologyEvidenceProfile {
  repositories: RawRepositoryEvidence[];
  evidence: EvidenceItem[];
  coverage: CollectionCoverage;
  requests: RequestAccounting;
  warnings: string[];
}

export interface TechnologyAffinity {
  id: string;
  name: string;
  kind: TechnologyKind;
  family: string;
  score: number | null;
  confidence: ConfidenceLevel;
  coverage: CoverageState;
  evidenceRepoCount: number;
  eligibleRepoCount: number;
  examinedRepoCount: number;
  lastEvidenceAt: string | null;
  evidence: EvidenceItem[];
  warnings: string[];
}

export type FrameworkAffinity = TechnologyAffinity & { kind: "school" };
export type ToolAffinity = TechnologyAffinity & { kind: "artifact" };

export interface ArchetypeAffinity {
  archetype: PracticeArchetype;
  score: number | null;
  observedScore: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  uncertainty: UncertaintyBudget;
  boundReason: string;
  scoreWithoutAttributes: number | null;
  confidence: ConfidenceLevel;
  coverage: CoverageState;
  components: Record<string, number | null>;
  evidence: EvidenceItem[];
  primaryEvidenceRepoCount: number;
}

export interface UncertaintyBudget {
  totalScore: number;
  schoolScore: number;
  artifactScore: number;
  reviewScore: number;
  uncertainRepositories: number;
  omittedManifests: number;
}

export interface DecisionAlternative<T> { value: T; score: number | null; reasonCode: string }

export interface Decision<T> {
  value: T | null;
  status: DecisionStatus;
  score: number | null;
  confidence: ConfidenceLevel;
  coverage: CoverageState;
  evidence: EvidenceItem[];
  alternatives: DecisionAlternative<T>[];
  rulesApplied: string[];
  reasonCode: string;
  reason: LocalizedText;
  rulesVersion: "game-engine-v2-experimental";
}

export type ClassDecision = Decision<ClassName> & { value: ClassName };
export type SubclassDecision = Decision<PracticeArchetype> & {
  observedScore: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  runnerUpUpperBound: number | null;
  guaranteedMargin: number | null;
  safeWinner: boolean;
  uncertainty: UncertaintyBudget;
  boundReason: string;
};
export type EvolutionId =
  | "evo-archmage" | "evo-celestial-guardian" | "evo-rune-master"
  | "evo-arcane-weaver" | "evo-ancestral-forger" | "evo-high-chronomancer"
  | "evo-celestial-architect";
export type EvolutionDecision = Decision<EvolutionId>;

export interface RequirementResult { id: string; met: boolean | null; coverage: CoverageState }

export interface AchievementV2 {
  id: string;
  origin: "v1" | "v2";
  name: LocalizedText;
  lore: LocalizedText;
  category: string;
  rarity: RarityV2;
  requirement: string;
  requiredEvidence: string[];
  cumulative: boolean;
  secret: boolean;
  unlocked: boolean;
  coverage: CoverageState;
  progress: number | null;
  target: number | null;
  evidence: EvidenceItem[];
}

export interface PublicAchievementV2 {
  id: string;
  rarity: RarityV2;
  unlocked: boolean;
  secret: boolean;
  name: string;
  description: string;
  requirement?: string;
  progress?: number | null;
}

export interface TitleV2 {
  id: string;
  origin: "v1" | "v2";
  name: LocalizedText;
  lore: LocalizedText;
  category: string;
  rarity: RarityV2;
  requirement: string;
  unlocked: boolean;
  requirements: RequirementResult[];
}

export interface AffinitySummary {
  name: string;
  bytes: number;
  sharePercent: number;
  repoCount: number;
  coverage: CoverageState;
  skillLevel: number;
  skillTier: string;
}

export interface CharacterExplanation {
  class: ClassDecision;
  subclass: SubclassDecision;
  evolution: EvolutionDecision;
  schools: FrameworkAffinity[];
  artifacts: ToolAffinity[];
  coverageWarnings: string[];
}

export interface RPGCharacterV2 {
  engineVersion: "2.0-experimental-v24-evo";
  schemaVersion: "game-engine-v2-schema-2";
  detectorVersion: "game-engine-v2-detectors-3-collector-v21";
  catalogVersion: "game-engine-v2-catalog-1";
  balanceVersion: "game-engine-v2-balance-v24-evolution-confidence";
  identity: RPGCharacter["identity"];
  meta: RPGCharacter["meta"] & { cacheNamespace: "v2-experimental" };
  progression: RPGCharacter["progression"];
  stats: RPGCharacter["stats"];
  resources: RPGCharacter["resources"];
  class: ClassDecision;
  subclass: SubclassDecision;
  evolution: EvolutionDecision;
  archetypes: ArchetypeAffinity[];
  grimoire: { affinities: AffinitySummary[]; schools: FrameworkAffinity[]; artifacts: ToolAffinity[] };
  achievements: AchievementV2[];
  titles: TitleV2[];
  defaultTitleId: string | null;
  explanation: CharacterExplanation;
  coverage: Record<string, CoverageState>;
  requests: RequestAccounting;
}

export interface CreateRPGCharacterV2Input {
  profile: DeveloperProfile;
  evidence: TechnologyEvidenceProfile;
}
