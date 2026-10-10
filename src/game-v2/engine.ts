import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { calculateSkills } from "@/game/skills/calculateSkills";
import { evaluateAchievementsV2 } from "./achievements";
import { applyEvidenceBounds } from "./bounds";
import { BALANCE_VERSION, CACHE_NAMESPACE, CATALOG_VERSION, DETECTOR_VERSION, ENGINE_VERSION, SCHEMA_VERSION, V2_BALANCE } from "./constants";
import { decideClass, decideEvolution, decideSubclass } from "./decisions";
import { calculateArchetypeAffinities, calculateTechnologyAffinities } from "./scoring";
import { evaluateTitlesV2, selectDefaultTitleIdV2 } from "./titles";
import type { AffinitySummary, CreateRPGCharacterV2Input, EvidenceItem, RPGCharacterV2 } from "./types";

function affinityEvidence(input: CreateRPGCharacterV2Input, name: string, _bytes: number): EvidenceItem[] {
  if (input.profile.languagesCoverage === "unavailable") return [];
  return [{ repoId: "aggregate", repoName: input.profile.username, itemId: name.toLowerCase(), itemKind: "affinity", sourcePath: "github.languages", sourceKind: "metric", strength: 100, observedAt: input.profile.referenceDate, detectorVersion: DETECTOR_VERSION, direct: true }];
}

export function createRPGCharacterV2(input: CreateRPGCharacterV2Input): RPGCharacterV2 {
  const { profile, evidence } = input;
  const v1 = createRPGCharacter(profile);
  const { schools, artifacts } = calculateTechnologyAffinities(evidence, profile.referenceDate);
  const observedArchetypes = calculateArchetypeAffinities(profile, schools, artifacts);
  const archetypes = applyEvidenceBounds(profile, evidence.coverage, schools, artifacts, observedArchetypes);
  const classDecision = decideClass(profile);
  const analysis = analyzeLanguages(profile.languages);
  classDecision.evidence = analysis.languages.slice(0, 3).flatMap((language) => affinityEvidence(input, language.name, language.bytes));
  const subclass = decideSubclass(profile, archetypes);
  const evolution = decideEvolution({ profile, className: classDecision.value, subclass, schools, artifacts });
  const achievements = evaluateAchievementsV2({ profile, schools, artifacts, subclass });
  const titles = evaluateTitlesV2({ profile, classDecision, subclass, schools, artifacts, achievements });
  const skills = calculateSkills(analysis);
  const affinities: AffinitySummary[] = analysis.languages.slice(0, V2_BALANCE.grimoireAffinityLimit).map((language) => {
    const skill = skills.find((item) => item.name === language.name);
    return { name: language.name, bytes: language.bytes, sharePercent: Math.floor(language.share * 1000) / 10, repoCount: language.repoCount, coverage: profile.languagesCoverage, skillLevel: skill?.level ?? 1, skillTier: skill?.tier ?? "Aprendiz" };
  });
  const visibleSchools = schools.filter((item) => (item.score ?? -1) >= V2_BALANCE.grimoireSchoolMin).slice(0, V2_BALANCE.grimoireSchoolLimit);
  const visibleArtifacts = artifacts.filter((item) => (item.score ?? -1) >= V2_BALANCE.grimoireArtifactMin).slice(0, V2_BALANCE.grimoireArtifactLimit);
  return {
    engineVersion: ENGINE_VERSION, schemaVersion: SCHEMA_VERSION, detectorVersion: DETECTOR_VERSION, catalogVersion: CATALOG_VERSION, balanceVersion: BALANCE_VERSION,
    identity: v1.identity, meta: { ...v1.meta, cacheNamespace: CACHE_NAMESPACE }, calculationCoverage: v1.calculationCoverage, progression: v1.progression, stats: v1.stats, resources: v1.resources,
    class: classDecision, subclass, evolution, archetypes,
    grimoire: { affinities, schools: visibleSchools, artifacts: visibleArtifacts },
    achievements, titles, defaultTitleId: selectDefaultTitleIdV2(titles),
    explanation: { class: classDecision, subclass, evolution, schools, artifacts, coverageWarnings: [...evidence.warnings] },
    coverage: { languages: profile.languagesCoverage, repositories: profile.ownRepositories.coverage, schools: evidence.coverage.coverage, artifacts: evidence.coverage.coverage, reviews: profile.reviews.coverage, activity: profile.activity.activeDays.coverage },
    requests: { ...evidence.requests },
  };
}
