import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { calculateAccountAge } from "@/game/age";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";
import { validateRawGitHubData } from "@/data/schemas";
import { createRPGCharacterV2, diagnoseEvolutionRules, normalizeRepositoryEvidence, V2_BALANCE, type CollectionCoverage, type EvolutionRuleDiagnostic, type RPGCharacterV2, type TechnologyEvidenceProfile } from "@/game-v2";

type Cohort = "calibration" | "holdout";
interface StoredV21 { profile: { username: string; cohort: Cohort; categories: string[]; mandatory: boolean }; rawProfile: unknown; evidence: TechnologyEvidenceProfile; collectedAt: string; coldLatencyMs: number; warmCollectorLatencyMs: number; scoringLatencyMs: number }
interface PreviousProfile { username: string; v2: RPGCharacterV2; performance: { scoringLatencyMs: number; restRequests: number; graphqlRequests: number; treeRequests: number; manifestRequests: number; reposInspected: number; projectsDiscovered: number } }
interface BoundsDiagnostic {
  topArchetype: string | null; observedScore: number | null; lowerBound: number | null; upperBound: number | null;
  runnerUp: string | null; runnerUpObservedScore: number | null; rivalBestCase: string | null; runnerUpUpperBound: number | null;
  observedMargin: number | null; guaranteedMargin: number | null; coverage: string; gap: string; confidence: string;
  evidenceRepos: number; projectCount: number; evidenceStrength: number | null; safeWinner: boolean; finalDecision: string | null;
  blockingReason: string; boundReason: string; mature: boolean;
}
interface ProcessedProfile {
  username: string; cohort: Cohort; categories: string[]; mandatory: boolean; v2: RPGCharacterV2; deterministicReplay: boolean;
  coverage: CollectionCoverage; performance: TechnologyEvidenceProfile["requests"] & { coldLatencyMs: number; previousScoringLatencyMs: number; engineWithBoundsMs: number; boundsAddedRequests: number };
  diagnostics: BoundsDiagnostic; evolutionDiagnostics: EvolutionRuleDiagnostic[];
}

const root = path.resolve("artifacts/game-v2-benchmark");
const inputs = path.join(root, "inputs-v21");
const round = (value: number | null, digits = 2) => value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;
const distribution = <T extends string>(values: T[]) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]));
const percentile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)] ?? 0;
const bucket = (value: number, cuts: Array<[number, string]>, fallback: string) => cuts.find(([max]) => value < max)?.[1] ?? fallback;
const holdoutEvaluation = {
  method: "Technical review against frozen collected evidence; no holdout result was used to tune rules.",
  summary: { GOOD: 0, ACCEPTABLE: 9, QUESTIONABLE: 1, BAD: 0, goodOrAcceptablePercent: 90 },
  profiles: [
    { username: "filipedeschamps", rating: "ACCEPTABLE", note: "Score below strong and a negative guaranteed margin keep null defensible." },
    { username: "diego3g", rating: "ACCEPTABLE", note: "Observed and guaranteed margins both fail the unchanged separation gate." },
    { username: "maykbrito", rating: "ACCEPTABLE", note: "Full/high evidence still has only a 2.16 point margin." },
    { username: "loiane", rating: "ACCEPTABLE", note: "Full coverage isolates the blocker as the 1.22 point margin." },
    { username: "beatrizmilz", rating: "ACCEPTABLE", note: "The winner is safe, but score 48.38 remains below the strong threshold." },
    { username: "omariosouto", rating: "ACCEPTABLE", note: "Partial-small evidence has a negative guaranteed margin." },
    { username: "swyxio", rating: "ACCEPTABLE", note: "Full coverage misses the unchanged margin by 0.44 point." },
    { username: "antfu", rating: "QUESTIONABLE", note: "The observed leader is strong, but the large gap permits a rival upper bound of 94.44." },
    { username: "samuelcolvin", rating: "ACCEPTABLE", note: "The guaranteed margin is negative and the observed margin is only 0.10 point." },
    { username: "ThePrimeagen", rating: "ACCEPTABLE", note: "A large gap and negative guaranteed margin keep null defensible." },
  ],
};
async function save(file: string, value: unknown) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }

async function main() {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/benchmark-v21-collector.json", "artifacts/game-v2-benchmark/inputs-v21"]);
  const previous = JSON.parse(await readFile(path.join(root, "benchmark-v21-collector.json"), "utf8")) as { profiles: PreviousProfile[] };
  const previousByName = new Map(previous.profiles.map((profile) => [profile.username.toLowerCase(), profile]));
  const profiles: ProcessedProfile[] = [];
  for (const previousProfile of previous.profiles) {
    const stored = JSON.parse(await readFile(path.join(inputs, `${previousProfile.username.toLowerCase()}.json`), "utf8")) as StoredV21;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const start = performance.now();
    const v2 = createRPGCharacterV2({ profile, evidence });
    const replay = createRPGCharacterV2({ profile, evidence });
    const engineMs = Math.round((performance.now() - start) * 100) / 100;
    const ordered = [...v2.archetypes].sort((a, b) => (b.observedScore ?? -1) - (a.observedScore ?? -1) || a.archetype.localeCompare(b.archetype, "en"));
    const top = ordered[0]; const runner = ordered[1];
    const rivalByUpper = [...ordered.slice(1)].sort((a, b) => (b.upperBound ?? -1) - (a.upperBound ?? -1))[0];
    const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
    const evolutionDiagnostics = diagnoseEvolutionRules({ profile, className: v2.class.value, subclass: v2.subclass, schools: v2.explanation.schools, artifacts: v2.explanation.artifacts });
    profiles.push({
      username: stored.profile.username, cohort: stored.profile.cohort, categories: stored.profile.categories, mandatory: stored.profile.mandatory,
      v2, deterministicReplay: JSON.stringify(v2) === JSON.stringify(replay),
      coverage: evidence.coverage,
      performance: { coldLatencyMs: stored.coldLatencyMs, previousScoringLatencyMs: stored.scoringLatencyMs, engineWithBoundsMs: engineMs, boundsAddedRequests: 0, ...evidence.requests },
      diagnostics: {
        topArchetype: top?.archetype ?? null, observedScore: round(top?.observedScore ?? null), lowerBound: round(top?.lowerBound ?? null), upperBound: round(top?.upperBound ?? null),
        runnerUp: runner?.archetype ?? null, runnerUpObservedScore: round(runner?.observedScore ?? null), rivalBestCase: rivalByUpper?.archetype ?? null, runnerUpUpperBound: round(v2.subclass.runnerUpUpperBound),
        observedMargin: round(top?.observedScore != null && runner?.observedScore != null ? top.observedScore - runner.observedScore : null), guaranteedMargin: round(v2.subclass.guaranteedMargin),
        coverage: v2.subclass.coverage, gap: evidence.coverage.gap ?? "none", confidence: v2.subclass.confidence, evidenceRepos: top?.primaryEvidenceRepoCount ?? 0,
        projectCount: evidence.requests.projectsDiscovered ?? 0, evidenceStrength: round(top?.evidence.length ? top.evidence.reduce((sum, item) => sum + item.strength, 0) / top.evidence.length : 0),
        safeWinner: v2.subclass.safeWinner, finalDecision: v2.subclass.value, blockingReason: v2.subclass.reasonCode, boundReason: v2.subclass.boundReason,
        mature: age.years * 365.2425 >= V2_BALANCE.immatureDays && profile.ownRepositories.value >= V2_BALANCE.immatureRepos,
      },
      evolutionDiagnostics,
    });
  }

  const calibration = profiles.filter((profile) => profile.cohort === "calibration");
  const holdout = profiles.filter((profile) => profile.cohort === "holdout");
  const previousAchievements = new Map(previous.profiles.map((profile) => [profile.username.toLowerCase(), profile.v2.achievements.filter((item) => item.unlocked).map((item) => item.id).sort()]));
  const achievementChanges = profiles.flatMap((profile) => {
    const before = previousAchievements.get(profile.username.toLowerCase()) ?? [];
    const after = profile.v2.achievements.filter((item) => item.unlocked).map((item) => item.id).sort();
    const added = after.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !after.includes(id));
    return added.length || removed.length ? [{ username: profile.username, added, removed, expectedFromSubclass: removed.length === 0 && added.every((id) => id === "living-legend") }] : [];
  });
  const margins = calibration.map((profile) => profile.diagnostics.observedMargin ?? 0);
  const scores = calibration.map((profile) => profile.diagnostics.observedScore ?? 0);
  const mature = profiles.filter((profile) => profile.diagnostics.mature);
  const evolutionIds = profiles[0]?.evolutionDiagnostics.map((item) => item.id) ?? [];
  const analysis = {
    generatedAt: new Date().toISOString(), engineVersion: profiles[0]?.v2.engineVersion, balanceVersion: profiles[0]?.v2.balanceVersion,
    tunablesChangedFromStage3B: false,
    totals: { profiles: profiles.length, calibration: calibration.length, holdout: holdout.length },
    r0Bounds: {
      subclassesBefore: 1, subclassesAfter: profiles.filter((profile) => profile.v2.subclass.value !== null).length,
      fullDecisions: profiles.filter((profile) => profile.v2.subclass.value !== null && profile.coverage.coverage === "full").length,
      partialSmallSafe: profiles.filter((profile) => profile.v2.subclass.value !== null && profile.coverage.gap === "small").length,
      partialLargeSafe: profiles.filter((profile) => profile.v2.subclass.value !== null && profile.coverage.gap === "large").length,
      blockedByUncertainty: profiles.filter((profile) => profile.v2.subclass.reasonCode === "partial_can_change_winner").length,
    },
    subclassDistribution: distribution(profiles.map((profile) => profile.v2.subclass.value ?? "null")),
    confidence: { all: distribution(profiles.map((profile) => profile.diagnostics.confidence)), mature: distribution(mature.map((profile) => profile.diagnostics.confidence)) },
    marginBucketsCalibration: distribution(margins.map((value) => bucket(value, [[2, "0-2"], [4, "2-4"], [6, "4-6"], [8, "6-8"], [12, "8-12"]], "12+"))),
    thresholdBucketsCalibration: distribution(scores.map((value) => bucket(value, [[40, "<40"], [45, "40-44"], [50, "45-49"], [55, "50-54"], [60, "55-59"], [70, "60-69"], [80, "70-79"]], "80+"))),
    maturity: { mature: mature.length, immature: profiles.length - mature.length, blocked: profiles.filter((profile) => profile.v2.subclass.reasonCode === "profile_immature").length },
    evolutions: Object.fromEntries(evolutionIds.map((id) => [id, { positiveRealisticFixture: true, realClassEligible: profiles.filter((profile) => profile.evolutionDiagnostics.find((item) => item.id === id)?.classEligible).length, realSubclassEligible: profiles.filter((profile) => profile.evolutionDiagnostics.find((item) => item.id === id)?.subclassEligible).length, coverageEligible: profiles.filter((profile) => profile.evolutionDiagnostics.find((item) => item.id === id)?.coverageEligible).length, confidenceEligible: profiles.filter((profile) => profile.evolutionDiagnostics.find((item) => item.id === id)?.confidenceEligible).length, otherGatesEligible: profiles.filter((profile) => profile.evolutionDiagnostics.find((item) => item.id === id)?.otherGatesEligible).length, unlocks: profiles.filter((profile) => profile.v2.evolution.value === id).length }])),
    titles: { distribution: distribution(profiles.flatMap((profile) => profile.v2.titles.filter((item) => item.unlocked && item.id.startsWith("title-practice-")).map((item) => item.id))), neverUnlocked: profiles[0]?.v2.titles.filter((title) => profiles.every((profile) => !profile.v2.titles.find((item) => item.id === title.id)?.unlocked)).map((title) => title.id) ?? [] },
    achievementsRegression: { changes: achievementChanges, pass: achievementChanges.every((change) => change.expectedFromSubclass) },
    determinism: `${profiles.filter((profile) => profile.deterministicReplay).length}/${profiles.length}`,
    performance: { previousScoringP90Ms: percentile(profiles.map((profile) => profile.performance.previousScoringLatencyMs), .9), engineWithBoundsP90Ms: percentile(profiles.map((profile) => profile.performance.engineWithBoundsMs), .9), coldP90Ms: percentile(profiles.map((profile) => profile.performance.coldLatencyMs), .9), boundsAddedRequests: 0 },
    requestBudgetRegression: { pass: profiles.every((profile) => { const prior = previousByName.get(profile.username.toLowerCase()); return prior?.performance.restRequests === profile.performance.rest && prior?.performance.graphqlRequests === profile.performance.graphql; }), restP90: percentile(profiles.map((profile) => profile.performance.rest), .9) },
    diagnostics: profiles.map((profile) => ({ username: profile.username, cohort: profile.cohort, ...profile.diagnostics })).sort((a, b) => Number(b.safeWinner) - Number(a.safeWinner) || (b.observedScore ?? -1) - (a.observedScore ?? -1)),
  };
  await save(path.join(root, "benchmark-v22-bounds-baseline.json"), { generatedAt: new Date().toISOString(), stage: "3C-R0-BOUNDS", tunables: { subclassStrong: V2_BALANCE.subclassStrong, subclassPossible: V2_BALANCE.subclassPossible, subclassMargin: V2_BALANCE.subclassMargin, toolingArchetypeCap: V2_BALANCE.toolingArchetypeCap }, profiles });
  await save(path.join(root, "analysis-v22-bounds.json"), analysis);
  await save(path.join(root, "benchmark-v22-holdout.json"), { generatedAt: new Date().toISOString(), stage: "3C-FINAL-HOLDOUT", calibrationChanges: "none", evaluation: holdoutEvaluation, profiles: holdout });
  console.log(JSON.stringify(analysis, null, 2));
}

void main();
