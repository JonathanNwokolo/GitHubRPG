import { createRPGCharacter } from "@/game/createCharacter";
import { presentAchievementV2 } from "./achievements";
import { ACHIEVEMENT_CATALOG_V2, TITLE_CATALOG_V2 } from "./catalogs";
import { ARCHETYPE_ORDER, ARTIFACTS, SCHOOLS, V2_BALANCE } from "./constants";
import { decideEvolution, decideSubclass, EVOLUTION_CATALOG } from "./decisions";
import { createRPGCharacterV2 } from "./engine";
import { GOLDEN_FIXTURES, makeEvidence, makeV2Profile } from "./fixtures";
import type { ArchetypeAffinity, PracticeArchetype, RawRepositoryEvidence } from "./types";

export interface InvariantResult { number: number; name: string; passed: boolean }
const validScore = (value: number | null): boolean => value === null || (Number.isFinite(value) && value >= 0 && value <= 100);
const affinity = (archetype: PracticeArchetype, score: number, upperBound = score, coverage: "full" | "partial" = "full"): ArchetypeAffinity => ({ archetype, score, observedScore: score, lowerBound: score, upperBound, uncertainty: { totalScore: upperBound - score, schoolScore: upperBound - score, artifactScore: 0, reviewScore: 0, uncertainRepositories: coverage === "partial" ? 1 : 0, omittedManifests: coverage === "partial" ? 1 : 0 }, boundReason: "fixture", scoreWithoutAttributes: score, confidence: "medium", coverage, components: {}, evidence: [], primaryEvidenceRepoCount: 2 });

export function reviewV2Invariants(): InvariantResult[] {
  const input = GOLDEN_FIXTURES.frontendReact();
  const character = createRPGCharacterV2(input);
  const repeated = createRPGCharacterV2(input);
  const empty = createRPGCharacterV2(GOLDEN_FIXTURES.emptyProfile());
  const unavailable = createRPGCharacterV2({ profile: makeV2Profile({ languages: [], languagesCoverage: "unavailable" }), evidence: makeEvidence([], "unavailable") });
  const fork: RawRepositoryEvidence = { id: "fork", name: "fork", isFork: true, isArchived: false, isEmpty: false, stars: 999, pushedAt: "2025-01-01T00:00:00Z", languages: { TypeScript: 1000 }, files: [{ path: "package.json", content: JSON.stringify({ dependencies: { next: "*", react: "*" } }) }] };
  const withFork = createRPGCharacterV2({ profile: GOLDEN_FIXTURES.emptyProfile().profile, evidence: makeEvidence([fork]) });
  const lockOnlyRepo: RawRepositoryEvidence = { ...fork, id: "lock-only", name: "lock-only", isFork: false, stars: 0, files: [{ path: "package-lock.json", content: JSON.stringify({ packages: { "node_modules/react": { version: "19" } } }) }] };
  const lockOnly = makeEvidence([lockOnlyRepo]);
  const lowScores = ARCHETYPE_ORDER.map((item, index) => affinity(item, index === 0 ? 54 : 10));
  const noSubclass = decideSubclass(makeV2Profile(), lowScores);
  const noEvolution = decideEvolution({ profile: makeV2Profile(), className: "Mago", subclass: noSubclass, schools: [], artifacts: [] });
  const allAffinities = [...character.explanation.schools, ...character.explanation.artifacts];
  const unlockedTitleRequirements = character.titles.filter((item) => item.unlocked).every((item) => item.requirements.every((requirement) => requirement.met === true));
  const secret = character.achievements.find((item) => item.secret && !item.unlocked);
  const v1 = createRPGCharacter(input.profile);
  const decisions = [character.class, character.subclass, character.evolution];
  const fullBounds = character.archetypes;
  const partialSmall = createRPGCharacterV2({ profile: input.profile, evidence: makeEvidence(input.evidence.repositories, "partial", 1) });
  const partialLarge = createRPGCharacterV2({ profile: input.profile, evidence: makeEvidence(input.evidence.repositories, "partial", 4) });
  const safePartial = decideSubclass(makeV2Profile(), [affinity("architect", 70, 75, "partial"), affinity("artificer", 50, 60, "partial"), affinity("illusionist", 20, 30, "partial"), affinity("guardian", 10, 20, "partial"), affinity("chronomancer", 5, 15, "partial")]);
  const unsafePartial = decideSubclass(makeV2Profile(), [affinity("architect", 70, 75, "partial"), affinity("artificer", 50, 68, "partial"), affinity("illusionist", 20, 30, "partial"), affinity("guardian", 10, 20, "partial"), affinity("chronomancer", 5, 15, "partial")]);
  const reachable = [GOLDEN_FIXTURES.architecturalSystem(), GOLDEN_FIXTURES.toolingBuild(), GOLDEN_FIXTURES.frontendReact(), GOLDEN_FIXTURES.testingReviewHeavy(), GOLDEN_FIXTURES.devOps()].map(createRPGCharacterV2);
  const genericOnly = [GOLDEN_FIXTURES.genericNext(), GOLDEN_FIXTURES.genericVite(), GOLDEN_FIXTURES.genericReact(), GOLDEN_FIXTURES.genericJest(), GOLDEN_FIXTURES.genericActions()].map(createRPGCharacterV2);
  const tied = decideSubclass(makeV2Profile(), ARCHETYPE_ORDER.map((item) => affinity(item, 70)));
  const forbiddenClaim = /professional competence|competência profissional|senioridade|empregabilidade/i;
  const rawError = /github_v2_|stack|authorization|bearer|token/i;
  const tests: Array<[string, boolean]> = [
    ["scores stay in 0..100", [...allAffinities.map((item) => item.score), ...character.archetypes.map((item) => item.score), character.class.score, character.subclass.score, character.evolution.score].every(validScore)],
    ["scores carry confidence and coverage", allAffinities.every((item) => Boolean(item.confidence && item.coverage)) && decisions.every((item) => Boolean(item.confidence && item.coverage))],
    ["unavailable is not silently zero", unavailable.explanation.schools.every((item) => item.score === null) && unavailable.subclass.score === null],
    ["partial coverage is marked as lower-bound warning", createRPGCharacterV2({ profile: input.profile, evidence: makeEvidence(input.evidence.repositories, "partial", 1) }).explanation.coverageWarnings.includes("manifest_coverage_is_lower_bound")],
    ["fork is never an owned evidence repository", withFork.explanation.schools.every((item) => item.evidenceRepoCount === 0)],
    ["fork has zero decision weight", withFork.class.value === empty.class.value && withFork.subclass.value === empty.subclass.value && withFork.evolution.value === empty.evolution.value],
    ["transitive lock evidence has zero weight", lockOnly.evidence.length === 0],
    ["technology requires structured evidence", allAffinities.filter((item) => item.evidenceRepoCount > 0).every((item) => item.evidence.every((evidence) => Boolean(evidence.repoId && evidence.sourcePath && evidence.sourceKind)))],
    ["evidence is deduplicated per repo and item", allAffinities.every((item) => new Set(item.evidence.map((evidence) => `${evidence.repoId}:${evidence.itemId}`)).size === item.evidence.length)],
    ["languages are represented by aggregate bytes", character.grimoire.affinities.every((item) => item.bytes >= 0 && item.sharePercent >= 0)],
    ["same input and reference date is deterministic", JSON.stringify(character) === JSON.stringify(repeated)],
    ["runtime output has no random seed", !JSON.stringify(character).includes("random")],
    ["all output orderings are stable", character.explanation.schools.map((item) => item.id).join() === repeated.explanation.schools.map((item) => item.id).join()],
    ["exactly one base class is emitted", typeof character.class.value === "string" && character.class.value.length > 0],
    ["subclass may be null", empty.subclass.value === null],
    ["evolution may be null", empty.evolution.value === null],
    ["at most one subclass is emitted", character.subclass.value === null || ARCHETYPE_ORDER.includes(character.subclass.value)],
    ["at most one evolution is emitted", character.evolution.value === null || character.evolution.value.startsWith("evo-")],
    ["largest archetype alone does not grant subclass", noSubclass.value === null && noSubclass.reasonCode === "score_below_threshold"],
    ["level alone does not grant evolution", noEvolution.value === null],
    ["no hybrid base class is created", ["Mago", "Alquimista", "Guerreiro", "Patrulheiro", "Paladino", "Bardo", "Ladino", "Oráculo", "Escriba", "Sentinela", "Tecelão", "Aventureiro"].includes(character.class.value)],
    ["decisions do not claim professional competence", decisions.every((item) => !forbiddenClaim.test(`${item.reason.pt} ${item.reason.en}`))],
    ["titles unlock only with satisfied requirements", unlockedTitleRequirements],
    ["locked secret hides name lore requirement and progress", secret ? !JSON.stringify(presentAchievementV2(secret, "en")).includes(secret.requirement) && presentAchievementV2(secret, "en").name === "???" : false],
    ["achievements grant no XP", character.achievements.every((item) => !("xp" in item))],
    ["V1 progression and attributes remain unchanged", JSON.stringify(character.progression) === JSON.stringify(v1.progression) && JSON.stringify(character.stats) === JSON.stringify(v1.stats)],
    ["V1 and V2 use separate versioned namespaces", character.meta.cacheNamespace === "v2-experimental" && character.schemaVersion.includes("v2")],
    ["catalog and detector versions are explicit", Boolean(character.catalogVersion && character.detectorVersion) && SCHOOLS.length === 22 && ARTIFACTS.length === 22 && ACHIEVEMENT_CATALOG_V2.length === 54 && TITLE_CATALOG_V2.length === 40],
    ["Grimoire limits do not truncate internal evidence", character.grimoire.schools.length <= V2_BALANCE.grimoireSchoolLimit && character.grimoire.artifacts.length <= V2_BALANCE.grimoireArtifactLimit && character.explanation.schools.length === 22 && character.explanation.artifacts.length === 22],
    ["raw collection errors never reach character copy", decisions.every((item) => !rawError.test(`${item.reason.pt} ${item.reason.en}`)) && character.explanation.coverageWarnings.every((warning) => !rawError.test(warning))],
    ["bounds preserve lower <= observed", partialLarge.archetypes.every((item) => item.lowerBound === null || item.lowerBound <= item.observedScore!)],
    ["bounds preserve observed <= upper", partialLarge.archetypes.every((item) => item.observedScore === null || item.observedScore <= item.upperBound!)],
    ["bounds remain clamped to 0..100", partialLarge.archetypes.every((item) => validScore(item.lowerBound) && validScore(item.upperBound))],
    ["full coverage has zero score uncertainty", fullBounds.every((item) => item.observedScore === item.lowerBound && item.lowerBound === item.upperBound && item.uncertainty.totalScore === 0)],
    ["partial coverage can grant only a mathematically safe winner", safePartial.value === "architect" && safePartial.safeWinner && safePartial.coverage === "partial"],
    ["partial coverage blocks an unsafe winner", unsafePartial.value === null && !unsafePartial.safeWinner && unsafePartial.reasonCode === "partial_can_change_winner"],
    ["increasing uncertainty never decreases an upper bound", partialLarge.archetypes.every((item) => item.upperBound! >= partialSmall.archetypes.find((candidate) => candidate.archetype === item.archetype)!.upperBound!)],
    ["generic signal caps are enforced", genericOnly.every((result) => result.archetypes.every((item) => item.scoreWithoutAttributes === null || item.scoreWithoutAttributes <= V2_BALANCE.genericSignalCap))],
    ["all five archetypes are realistically reachable", reachable.map((result) => result.subclass.value).join() === ARCHETYPE_ORDER.join()],
    ["no single generic signal creates a strong subclass", genericOnly.every((result) => result.subclass.value === null)],
    ["deterministic ties use stable order and still preserve null", tied.value === null && tied.reasonCode === "margin_insufficient" && tied.alternatives[0]?.value === "artificer"],
    ["evolution catalog contains exactly seven unique ids", EVOLUTION_CATALOG.length === 7 && new Set(EVOLUTION_CATALOG.map((item) => item.id)).size === 7],
    ["all evolutions have deterministic PT-BR and EN names", EVOLUTION_CATALOG.every((item) => item.name.pt.length > 0 && item.name.en.length > 0)],
    ["evolutions never depend on equipped titles, titles, or achievements", EVOLUTION_CATALOG.every((item) => !Object.keys(item).some((key) => /equipped|title|achievement/i.test(key)))],
    ["High Chronomancer accepts collector-realistic medium confidence", EVOLUTION_CATALOG.find((item) => item.id === "evo-high-chronomancer")?.minConfidence === "medium"],
    ["all other evolutions preserve high confidence", EVOLUTION_CATALOG.filter((item) => item.id !== "evo-high-chronomancer").every((item) => item.minConfidence === "high")],
  ];
  return tests.map(([name, passed], index) => ({ number: index + 1, name, passed }));
}
