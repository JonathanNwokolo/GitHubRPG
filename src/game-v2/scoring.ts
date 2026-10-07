import type { DeveloperProfile } from "@/game/types";
import { affinityView, calculateArchetypeModel } from "./archetypeModel";
import { ARTIFACTS, SCHOOLS, V2_BALANCE, type TechnologyDefinition } from "./constants";
import type { ArchetypeAffinity, ConfidenceLevel, CoverageState, EvidenceItem, FrameworkAffinity, TechnologyAffinity, TechnologyEvidenceProfile, ToolAffinity } from "./types";

export function clampScore(value: number): number { return Math.max(0, Math.min(100, value)); }

function recencyScore(date: string, referenceDate: string): number {
  const age = Math.max(0, Date.parse(referenceDate) - Date.parse(date));
  const years = age / (365.2425 * 86_400_000);
  return years <= 1 ? 100 : years <= 2 ? 75 : years <= 4 ? 45 : 20;
}

function confidence(coverage: CoverageState, evidence: readonly EvidenceItem[]): ConfidenceLevel {
  if (coverage === "unavailable") return "unavailable";
  const repos = new Set(evidence.map((item) => item.repoId)).size;
  const primaryKinds = new Set(evidence.filter((item) => item.sourceKind !== "lockCorroboration").map((item) => item.sourceKind)).size;
  if (coverage === "full" && repos >= 5 && primaryKinds >= 2) return "high";
  if (repos >= 2 && evidence.some((item) => item.direct)) return "medium";
  return "low";
}

function scoreTechnology(profile: TechnologyEvidenceProfile, definition: TechnologyDefinition, kind: "school" | "artifact", referenceDate: string): TechnologyAffinity {
  if (profile.coverage.coverage === "unavailable") return {
    id: definition.id, name: definition.name, family: definition.family, kind, score: null, confidence: "unavailable", coverage: "unavailable",
    evidenceRepoCount: 0, eligibleRepoCount: profile.coverage.eligible, examinedRepoCount: profile.coverage.examined, lastEvidenceAt: null, evidence: [], warnings: [...profile.warnings],
  };
  const evidence = profile.evidence.filter((item) => item.itemKind === kind && item.itemId === definition.id);
  const repoEvidence = [...new Map(evidence.map((item) => [item.repoId, item])).values()];
  const count = repoEvidence.length;
  const repoPresence = 100 * Math.min(count / V2_BALANCE.affinityRepoSaturation, 1);
  const recurrence = profile.coverage.examined === 0 ? 0 : (100 * count) / profile.coverage.examined;
  const recency = count === 0 ? 0 : repoEvidence.reduce((sum, item) => sum + recencyScore(item.observedAt, referenceDate), 0) / count;
  const strength = count === 0 ? 0 : repoEvidence.reduce((sum, item) => sum + item.strength, 0) / count;
  const score = kind === "school"
    ? 0.35 * repoPresence + 0.25 * recurrence + 0.20 * recency + 0.20 * strength
    : 0.30 * repoPresence + 0.20 * recurrence + 0.15 * recency + 0.35 * strength;
  return {
    id: definition.id, name: definition.name, family: definition.family, kind, score: clampScore(score), confidence: confidence(profile.coverage.coverage, repoEvidence), coverage: profile.coverage.coverage,
    evidenceRepoCount: count, eligibleRepoCount: profile.coverage.eligible, examinedRepoCount: profile.coverage.examined,
    lastEvidenceAt: repoEvidence.map((item) => item.observedAt).sort().at(-1) ?? null, evidence: repoEvidence, warnings: [...profile.warnings],
  };
}

export function calculateTechnologyAffinities(profile: TechnologyEvidenceProfile, referenceDate: string): { schools: FrameworkAffinity[]; artifacts: ToolAffinity[] } {
  const order = (a: TechnologyAffinity, b: TechnologyAffinity) => (b.score ?? -1) - (a.score ?? -1) || b.evidenceRepoCount - a.evidenceRepoCount || a.name.localeCompare(b.name, "en");
  return {
    schools: SCHOOLS.map((definition) => scoreTechnology(profile, definition, "school", referenceDate) as FrameworkAffinity).sort(order),
    artifacts: ARTIFACTS.map((definition) => scoreTechnology(profile, definition, "artifact", referenceDate) as ToolAffinity).sort(order),
  };
}

function combinedCoverage(schools: readonly FrameworkAffinity[], artifacts: readonly ToolAffinity[]): CoverageState {
  if (schools.every((item) => item.coverage === "unavailable") && artifacts.every((item) => item.coverage === "unavailable")) return "unavailable";
  return [...schools, ...artifacts].some((item) => item.coverage !== "full") ? "partial" : "full";
}

function archetypeConfidence(coverage: CoverageState, evidence: readonly EvidenceItem[]): ConfidenceLevel { return confidence(coverage, evidence); }

export function calculateArchetypeAffinities(profile: DeveloperProfile, schools: FrameworkAffinity[], artifacts: ToolAffinity[]): ArchetypeAffinity[] {
  const model = calculateArchetypeModel(profile, schools.map(affinityView), artifacts.map(affinityView));
  const coverage = combinedCoverage(schools, artifacts);
  return model.map((item) => {
    const score = item.score;
    const sources = [...schools, ...artifacts].filter((technology) => item.signalIds.includes(technology.id)).flatMap((technology) => technology.evidence);
    const evidence = [...new Map(sources.map((item) => [`${item.repoId}:${item.itemId}`, item])).values()];
    return { archetype: item.archetype, score, observedScore: score, lowerBound: score, upperBound: score, uncertainty: { totalScore: 0, schoolScore: 0, artifactScore: 0, reviewScore: 0, uncertainRepositories: 0, omittedManifests: 0 }, boundReason: "bounds_not_applied", scoreWithoutAttributes: item.primary, confidence: score === null ? "unavailable" : archetypeConfidence(coverage, evidence), coverage: score === null ? "unavailable" : coverage, components: item.components, evidence, primaryEvidenceRepoCount: new Set(evidence.map((evidenceItem) => evidenceItem.repoId)).size };
  });
}
