import type { DeveloperProfile } from "@/game/types";
import { calculateArchetypeModel, type ArchetypeTechnologyView } from "./archetypeModel";
import { ARCHETYPE_ORDER, ARTIFACTS, SCHOOLS, V2_BALANCE } from "./constants";
import { clampScore } from "./scoring";
import type { ArchetypeAffinity, CollectionCoverage, TechnologyAffinity, UncertaintyBudget } from "./types";

interface BoundedTechnology extends TechnologyAffinity { lowerScore: number; upperScore: number; upperEvidenceRepoCount: number }
type BoundMode = "observed" | "lower" | "upper";

function recencyScore(date: string, referenceDate: string): number {
  const age = Math.max(0, Date.parse(referenceDate) - Date.parse(date));
  const years = age / (365.2425 * 86_400_000);
  return years <= 1 ? 100 : years <= 2 ? 75 : years <= 4 ? 45 : 20;
}

export function uncertainRepositoryCount(coverage: CollectionCoverage): number {
  if (coverage.coverage === "full" || coverage.gap === "none") return 0;
  if (coverage.uncertainRepositories !== undefined) return Math.min(coverage.eligible, coverage.uncertainRepositories);
  const omittedFiles = Math.max(coverage.omittedByBudget, coverage.manifestsSkippedByBudget ?? 0);
  const unknownTrees = (coverage.treesTruncated ?? 0) + coverage.failed;
  return Math.min(coverage.eligible, omittedFiles + unknownTrees);
}

function technologyFormula(kind: TechnologyAffinity["kind"], count: number, eligible: number, recency: number, strength: number): number {
  const repoPresence = 100 * Math.min(count / V2_BALANCE.affinityRepoSaturation, 1);
  const recurrence = eligible === 0 ? 0 : (100 * count) / eligible;
  return kind === "school"
    ? 0.35 * repoPresence + 0.25 * recurrence + 0.20 * recency + 0.20 * strength
    : 0.30 * repoPresence + 0.20 * recurrence + 0.15 * recency + 0.35 * strength;
}

function boundedTechnology(item: TechnologyAffinity, coverage: CollectionCoverage, referenceDate: string): BoundedTechnology {
  const uncertainRepos = uncertainRepositoryCount(coverage);
  if (item.score === null || uncertainRepos === 0) return { ...item, lowerScore: item.score ?? 0, upperScore: item.score ?? 0, upperEvidenceRepoCount: item.evidenceRepoCount };
  const possibleNewRepos = Math.min(uncertainRepos, Math.max(0, coverage.eligible - item.evidenceRepoCount));
  const upperCount = item.evidenceRepoCount + possibleNewRepos;
  if (upperCount === 0) return { ...item, lowerScore: item.score, upperScore: item.score, upperEvidenceRepoCount: 0 };
  const recencySum = item.evidence.reduce((sum, evidence) => sum + recencyScore(evidence.observedAt, referenceDate), 0);
  const strengthSum = item.evidence.reduce((sum, evidence) => sum + evidence.strength, 0);
  const upperScore = technologyFormula(item.kind, upperCount, coverage.eligible, (recencySum + possibleNewRepos * 100) / upperCount, (strengthSum + possibleNewRepos * 100) / upperCount);
  let lowerScore = item.score;
  for (let added = 1; added <= possibleNewRepos; added++) {
    const count = item.evidenceRepoCount + added;
    // Contextual config is the weakest structured evidence admitted by V2.1:
    // recency floor 20 and rounded strength floor 28 (55 * 0.5).
    const candidate = technologyFormula(item.kind, count, coverage.eligible, (recencySum + added * 20) / count, (strengthSum + added * 28) / count);
    lowerScore = Math.min(lowerScore, candidate);
  }
  return { ...item, lowerScore: clampScore(lowerScore), upperScore: clampScore(Math.max(item.score, upperScore)), upperEvidenceRepoCount: upperCount };
}

function view(items: readonly BoundedTechnology[], mode: BoundMode): ArchetypeTechnologyView[] {
  return items.map((item) => ({
    id: item.id,
    family: item.family,
    score: item.score === null ? null : mode === "upper" ? item.upperScore : mode === "lower" ? item.lowerScore : item.score,
    evidenceRepoCount: mode === "upper" ? item.upperEvidenceRepoCount : item.evidenceRepoCount,
  }));
}

export function applyEvidenceBounds(profile: DeveloperProfile, coverage: CollectionCoverage, schoolsInput: TechnologyAffinity[], artifactsInput: TechnologyAffinity[], observed: ArchetypeAffinity[]): ArchetypeAffinity[] {
  const schools = SCHOOLS.map((definition) => boundedTechnology(schoolsInput.find((item) => item.id === definition.id)!, coverage, profile.referenceDate));
  const artifacts = ARTIFACTS.map((definition) => boundedTechnology(artifactsInput.find((item) => item.id === definition.id)!, coverage, profile.referenceDate));
  const reviewObserved = profile.reviews.coverage === "unavailable" ? null : clampScore(profile.reviews.value / 2);
  const reviewUpper = profile.reviews.coverage === "partial" ? 100 : reviewObserved;
  const model = (schoolMode: BoundMode, artifactMode: BoundMode, review: number | null) => calculateArchetypeModel(profile, view(schools, schoolMode), view(artifacts, artifactMode), review);
  const lowerModel = model("lower", "lower", reviewObserved);
  const schoolModel = model("upper", "observed", reviewObserved);
  const artifactModel = model("observed", "upper", reviewObserved);
  const reviewModel = model("observed", "observed", reviewUpper);
  const upperModel = model("upper", "upper", reviewUpper);
  const uncertainRepos = uncertainRepositoryCount(coverage);
  const omittedManifests = Math.max(coverage.omittedByBudget, coverage.manifestsSkippedByBudget ?? 0);
  return ARCHETYPE_ORDER.map((archetype) => {
    const item = observed.find((candidate) => candidate.archetype === archetype)!;
    const observedScore = item.score;
    if (observedScore === null) return { ...item, observedScore: null, lowerBound: null, upperBound: null, uncertainty: { totalScore: 0, schoolScore: 0, artifactScore: 0, reviewScore: 0, uncertainRepositories: uncertainRepos, omittedManifests }, boundReason: "evidence_unavailable" };
    const scoreFrom = (source: ReturnType<typeof calculateArchetypeModel>) => source.find((candidate) => candidate.archetype === archetype)?.score ?? observedScore;
    const lowerBound = Math.min(observedScore, scoreFrom(lowerModel));
    const upperBound = Math.max(observedScore, scoreFrom(upperModel));
    const delta = (value: number | null) => Math.max(0, (value ?? observedScore) - observedScore);
    const uncertainty: UncertaintyBudget = {
      totalScore: upperBound - lowerBound,
      schoolScore: delta(scoreFrom(schoolModel)),
      artifactScore: delta(scoreFrom(artifactModel)),
      reviewScore: delta(scoreFrom(reviewModel)),
      uncertainRepositories: uncertainRepos,
      omittedManifests,
    };
    return { ...item, observedScore, lowerBound, upperBound, uncertainty, boundReason: uncertainty.totalScore === 0 ? "no_unobserved_score_potential" : coverage.gap === "small" ? "small_gap_formula_bound" : "large_gap_formula_bound" };
  });
}
