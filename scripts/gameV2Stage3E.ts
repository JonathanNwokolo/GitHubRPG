import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";
import { loadEnvFiles } from "./loadEnv";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { calculateAccountAge } from "@/game/age";
import { calculateStats } from "@/game/attributes/calculateAttributes";
import { analyzeLanguages } from "@/game/languages";
import type { DeveloperProfile } from "@/game/types";
import {
  ARCHETYPE_ORDER,
  ARCHETYPE_SIGNAL_SPECIFICITY,
  V2_BALANCE,
  collectGitHubEvidenceV21,
  createRPGCharacterV2,
  normalizeRepositoryEvidence,
  type PracticeArchetype,
  type RPGCharacterV2,
  type TechnologyAffinity,
  type TechnologyEvidenceProfile,
} from "@/game-v2";

interface MatrixProfile { username: string; category: string; publicReposAtFreeze: number; reason: string }
interface MatrixArtifact { frozenAt: string; freezeState: string; engineVersion: string; selectionReadModelOutputs: boolean; profiles: MatrixProfile[] }
interface StoredInput { matrixProfile: MatrixProfile; rawProfile: unknown; evidence: TechnologyEvidenceProfile; collectedAt: string; coldLatencyMs: number }
interface HumanEvaluation { username: string; rating: "GOOD" | "ACCEPTABLE" | "QUESTIONABLE" | "BAD"; note: string }
interface ProcessedProfile {
  username: string; category: string; reason: string; profile: DeveloperProfile; evidence: TechnologyEvidenceProfile; v2: RPGCharacterV2;
  scores: Record<PracticeArchetype, number>; top1: PracticeArchetype; top2: PracticeArchetype; observedMargin: number; guaranteedMargin: number;
  coverage: string; gap: string; confidence: string; maturity: number; safeWinner: boolean; subclass: PracticeArchetype | null; reasonCode: string;
  schools: Array<{ id: string; score: number; repos: number }>; artifacts: Array<{ id: string; score: number; repos: number }>;
  compositeSignals: Record<PracticeArchetype, string[]>; withoutGenericCap: Record<PracticeArchetype, number | null>; uniformSpecificity: Record<PracticeArchetype, number | null>;
  evolution: string | null; titles: string[]; achievements: string[];
  deterministicReplay: boolean; engineMs: number; coldLatencyMs: number; requests: TechnologyEvidenceProfile["requests"];
}

const root = path.resolve("artifacts/game-v2-generalization");
const inputs = path.join(root, "inputs-v24");
const matrixFile = path.join(root, "matrix-v24.json");
const evaluationFile = path.join(root, "g0-human-evaluation.json");
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const distribution = (values: string[]) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));
const average = (values: number[]) => round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));
const percentile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)] ?? 0;
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function pearson(left: number[], right: number[]): number {
  const leftMean = average(left); const rightMean = average(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftScale = Math.sqrt(left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0));
  const rightScale = Math.sqrt(right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  return leftScale === 0 || rightScale === 0 ? 0 : round(numerator / (leftScale * rightScale), 3);
}

function scoreBucket(value: number): string {
  return value < 30 ? "<30" : value < 40 ? "30-39" : value < 45 ? "40-44" : value < 50 ? "45-49" : value < 55 ? "50-54" : value < 60 ? "55-59" : value < 70 ? "60-69" : "70+";
}
function marginBucket(value: number): string {
  return value <= 2 ? "0-2" : value <= 4 ? ">2-4" : value <= 5 ? ">4-5" : value <= 8 ? ">5-8" : value <= 12 ? ">8-12" : ">12";
}
function guaranteedMarginBucket(value: number): string { return value < 0 ? "<0" : marginBucket(value); }
function coverageLabel(evidence: TechnologyEvidenceProfile): string {
  if (evidence.coverage.coverage === "unavailable") return "unavailable";
  if (evidence.coverage.coverage === "full") return "full";
  return evidence.coverage.gap === "small" ? "partial-small" : "partial-large";
}
function blocker(v2: RPGCharacterV2): string {
  if (v2.subclass.value !== null) return "NONE";
  const reason = v2.subclass.reasonCode;
  if (reason === "score_below_threshold") return "SCORE";
  if (reason === "margin_insufficient") return "MARGIN";
  if (reason === "partial_can_change_winner") return "BOUNDS";
  if (reason === "confidence_insufficient" || reason === "evidence_repo_count_insufficient") return "CONFIDENCE";
  if (reason === "profile_immature") return "MATURITY";
  if (reason === "evidence_unavailable") return "COVERAGE";
  return "LEGITIMATE_AMBIGUITY";
}

interface CounterfactualOptions { genericCap: number; specificity: "configured" | "uniform"; composites: boolean }
function counterfactualScores(profile: DeveloperProfile, technologies: TechnologyAffinity[], options: CounterfactualOptions): Record<PracticeArchetype, number | null> {
  const stats = calculateStats(profile, analyzeLanguages(profile.languages), calculateAccountAge(profile.accountCreatedAt, profile.referenceDate));
  const collaboration = profile.reviews.coverage === "unavailable" ? null : clamp(profile.reviews.value / 2);
  const primary = Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => {
    const definitions = ARCHETYPE_SIGNAL_SPECIFICITY[archetype];
    const signals = technologies.flatMap((technology) => {
      const definition = definitions[technology.id];
      if (!definition || technology.score === null || technology.evidenceRepoCount === 0) return [];
      const raw = technology.score * (options.specificity === "uniform" ? 1 : definition.specificity);
      return [{ id: technology.id, role: definition.role, value: definition.generic ? Math.min(options.genericCap, raw) : raw }];
    }).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id, "en"));
    let score = (signals[0]?.value ?? 0) + .30 * (signals[1]?.value ?? 0) + .15 * (signals[2]?.value ?? 0);
    const roles = new Set(signals.map((signal) => signal.role));
    if (options.composites && archetype === "architect") { if (roles.has("meta") && roles.has("backend")) score += 18; if (signals.length >= 3) score += 6; }
    if (options.composites && archetype === "artificer") { if (signals.filter((signal) => signal.value > V2_BALANCE.genericSignalCap).length >= 2) score += 15; if (roles.has("build") && (roles.has("desktop") || roles.has("toolchain"))) score += 8; }
    if (options.composites && archetype === "illusionist") { if (roles.has("ui") && roles.has("visual")) score += 18; if (signals.filter((signal) => signal.role === "ui").length >= 2) score += 6; if (signals.some((signal) => signal.id === "storybook") && roles.has("ui")) score += 6; }
    if (options.composites && archetype === "guardian") { if (signals.length >= 2) score += 15; if (signals.length >= 2 && (collaboration ?? 0) >= 50) score += 8; }
    if (options.composites && archetype === "chronomancer") { if (roles.has("pipeline") && (roles.has("delivery") || roles.has("infra"))) score += 18; if (roles.has("delivery") && roles.has("infra")) score += 10; if (signals.length >= 3) score += 6; }
    return [archetype, clamp(score)];
  })) as Record<PracticeArchetype, number>;
  return {
    architect: clamp(.78 * primary.architect + .08 * stats.experience + .07 * stats.versatility + .04 * primary.guardian + .03 * primary.chronomancer),
    artificer: clamp(.80 * primary.artificer + .08 * stats.experience + .07 * stats.versatility + .05 * primary.chronomancer),
    illusionist: clamp(.80 * primary.illusionist + .06 * stats.experience + .06 * stats.versatility + .05 * primary.architect + .03 * primary.guardian),
    guardian: collaboration === null ? null : clamp(.75 * primary.guardian + .10 * collaboration + .07 * stats.consistency + .03 * stats.experience + .05 * primary.chronomancer),
    chronomancer: clamp(.80 * primary.chronomancer + .07 * stats.consistency + .05 * primary.artificer + .04 * stats.experience + .04 * stats.versatility),
  };
}

function compositeSignals(technologies: TechnologyAffinity[], profile: DeveloperProfile): Record<PracticeArchetype, string[]> {
  const collaboration = profile.reviews.coverage === "unavailable" ? null : clamp(profile.reviews.value / 2);
  return Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => {
    const definitions = ARCHETYPE_SIGNAL_SPECIFICITY[archetype];
    const signals = technologies.flatMap((technology) => {
      const definition = definitions[technology.id];
      return definition && technology.score !== null && technology.evidenceRepoCount > 0 ? [{ id: technology.id, role: definition.role, value: definition.generic ? Math.min(V2_BALANCE.genericSignalCap, technology.score * definition.specificity) : technology.score * definition.specificity }] : [];
    });
    const roles = new Set(signals.map((signal) => signal.role)); const active: string[] = [];
    if (archetype === "architect") { if (roles.has("meta") && roles.has("backend")) active.push("meta+backend"); if (signals.length >= 3) active.push("three-signals"); }
    if (archetype === "artificer") { if (signals.filter((signal) => signal.value > V2_BALANCE.genericSignalCap).length >= 2) active.push("two-specific"); if (roles.has("build") && (roles.has("desktop") || roles.has("toolchain"))) active.push("build+craft"); }
    if (archetype === "illusionist") { if (roles.has("ui") && roles.has("visual")) active.push("ui+visual"); if (signals.filter((signal) => signal.role === "ui").length >= 2) active.push("multi-ui"); if (signals.some((signal) => signal.id === "storybook") && roles.has("ui")) active.push("storybook+ui"); }
    if (archetype === "guardian") { if (signals.length >= 2) active.push("multi-test"); if (signals.length >= 2 && (collaboration ?? 0) >= 50) active.push("multi-test+collaboration"); }
    if (archetype === "chronomancer") { if (roles.has("pipeline") && (roles.has("delivery") || roles.has("infra"))) active.push("pipeline+delivery"); if (roles.has("delivery") && roles.has("infra")) active.push("delivery+infra"); if (signals.length >= 3) active.push("three-signals"); }
    return [archetype, active];
  })) as Record<PracticeArchetype, string[]>;
}

async function loadMatrix(): Promise<MatrixArtifact> {
  const matrix = JSON.parse(await readFile(matrixFile, "utf8")) as MatrixArtifact;
  if (matrix.freezeState !== "FROZEN_BEFORE_G0" || matrix.selectionReadModelOutputs || matrix.profiles.length !== 30) throw new Error("Independent matrix is not validly frozen.");
  const prior = new Set<string>();
  for (const file of (await readdir(path.resolve("artifacts/game-v2-benchmark/inputs-v21"))).filter((item) => item.endsWith(".json"))) {
    const stored = JSON.parse(await readFile(path.resolve("artifacts/game-v2-benchmark/inputs-v21", file), "utf8")) as { profile: { username: string } };
    prior.add(stored.profile.username.toLowerCase());
  }
  const overlap = matrix.profiles.filter((item) => prior.has(item.username.toLowerCase()));
  if (overlap.length) throw new Error(`Independent matrix overlaps prior data: ${overlap.map((item) => item.username).join(", ")}`);
  return matrix;
}

async function collect(matrix: MatrixArtifact): Promise<void> {
  loadEnvFiles();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN is required for Stage 3E collection.");
  const source = new GitHubApiDataSource({ token, repositoryTransport: "auto", timeoutMs: 30_000 });
  await mkdir(inputs, { recursive: true });
  for (const item of matrix.profiles) {
    const file = path.join(inputs, `${item.username.toLowerCase()}.json`);
    try { await readFile(file, "utf8"); console.log(`SKIP ${item.username}`); continue; } catch { /* collect */ }
    const started = performance.now();
    const rawProfile = await source.getProfile(item.username);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(rawProfile));
    const evidence = await collectGitHubEvidenceV21(item.username, { token, referenceDate: profile.referenceDate, sourceFingerprint: `stage3e:${profile.username}:${profile.ownRepositories.value}:${profile.languages.length}` });
    const stored: StoredInput = { matrixProfile: item, rawProfile, evidence, collectedAt: new Date().toISOString(), coldLatencyMs: Math.round(performance.now() - started) };
    await writeFile(file, `${JSON.stringify(stored, null, 2)}\n`, "utf8");
    console.log(`COLLECTED ${item.username}: coverage=${coverageLabel(evidence)} REST=${evidence.requests.rest} GraphQL=${evidence.requests.graphql} remaining=${evidence.requests.rateLimitRemaining ?? "unknown"}`);
  }
}

async function loadHumanEvaluation(): Promise<HumanEvaluation[]> {
  try { return JSON.parse(await readFile(evaluationFile, "utf8")) as HumanEvaluation[]; } catch { return []; }
}

async function analyze(matrix: MatrixArtifact): Promise<void> {
  const profiles: ProcessedProfile[] = [];
  for (const item of matrix.profiles) {
    const stored = JSON.parse(await readFile(path.join(inputs, `${item.username.toLowerCase()}.json`), "utf8")) as StoredInput;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const started = performance.now(); const v2 = createRPGCharacterV2({ profile, evidence }); const engineMs = performance.now() - started;
    const replay = createRPGCharacterV2({ profile, evidence });
    const ordered = [...v2.archetypes].sort((a, b) => (b.observedScore ?? -1) - (a.observedScore ?? -1) || ARCHETYPE_ORDER.indexOf(a.archetype) - ARCHETYPE_ORDER.indexOf(b.archetype));
    const scores = Object.fromEntries(v2.archetypes.map((entry) => [entry.archetype, round(entry.observedScore ?? 0)])) as Record<PracticeArchetype, number>;
    const technologies = [...v2.explanation.schools, ...v2.explanation.artifacts];
    profiles.push({
      username: item.username, category: item.category, reason: item.reason, profile, evidence, v2, scores, top1: ordered[0].archetype, top2: ordered[1].archetype,
      observedMargin: round((ordered[0].observedScore ?? 0) - (ordered[1].observedScore ?? 0)), guaranteedMargin: round(v2.subclass.guaranteedMargin ?? 0), coverage: coverageLabel(evidence), gap: evidence.coverage.gap ?? "none",
      confidence: v2.subclass.confidence, maturity: round(v2.archetypes[0]?.components.maturity ?? 0), safeWinner: v2.subclass.safeWinner, subclass: v2.subclass.value, reasonCode: v2.subclass.reasonCode,
      schools: v2.explanation.schools.filter((entry) => entry.evidenceRepoCount > 0).map((entry) => ({ id: entry.id, score: round(entry.score ?? 0), repos: entry.evidenceRepoCount })),
      artifacts: v2.explanation.artifacts.filter((entry) => entry.evidenceRepoCount > 0).map((entry) => ({ id: entry.id, score: round(entry.score ?? 0), repos: entry.evidenceRepoCount })),
      compositeSignals: compositeSignals(technologies, profile),
      withoutGenericCap: counterfactualScores(profile, technologies, { genericCap: Number.POSITIVE_INFINITY, specificity: "configured", composites: true }),
      uniformSpecificity: counterfactualScores(profile, technologies, { genericCap: V2_BALANCE.genericSignalCap, specificity: "uniform", composites: true }),
      evolution: v2.evolution.value, titles: v2.titles.filter((entry) => entry.unlocked).map((entry) => entry.id), achievements: v2.achievements.filter((entry) => entry.unlocked).map((entry) => entry.id),
      deterministicReplay: JSON.stringify(v2) === JSON.stringify(replay), engineMs: round(engineMs), coldLatencyMs: stored.coldLatencyMs, requests: evidence.requests,
    });
  }
  const human = await loadHumanEvaluation(); const humanByName = new Map(human.map((item) => [item.username.toLowerCase(), item]));
  const results = { generatedAt: new Date().toISOString(), stage: "3E-G0-INDEPENDENT-BASELINE", matrixFrozenAt: matrix.frozenAt, engineVersion: profiles[0]?.v2.engineVersion, balanceVersion: profiles[0]?.v2.balanceVersion, tunablesChangedBeforeG0: false, profiles: profiles.map(({ profile: _profile, evidence: _evidence, v2: _v2, ...item }) => ({ ...item, evaluation: humanByName.get(item.username.toLowerCase()) ?? null })) };
  const quality = distribution(human.map((item) => item.rating));
  const correlations = Object.fromEntries(ARCHETYPE_ORDER.map((left) => [left, Object.fromEntries(ARCHETYPE_ORDER.map((right) => [right, pearson(profiles.map((item) => item.scores[left]), profiles.map((item) => item.scores[right]))]))]));
  const reachability = Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => [archetype, {
    top1: profiles.filter((item) => item.top1 === archetype).length, top2: profiles.filter((item) => item.top2 === archetype).length,
    atLeast45: profiles.filter((item) => item.scores[archetype] >= 45).length, atLeast55: profiles.filter((item) => item.scores[archetype] >= 55).length,
    safeWinner: profiles.filter((item) => item.top1 === archetype && item.safeWinner).length,
  }]));
  const partialSmall = profiles.filter((item) => item.coverage === "partial-small");
  const calibrationArtifact = JSON.parse(await readFile(path.resolve("artifacts/game-v2-benchmark/benchmark-v23-r1-signals.json"), "utf8")) as { matrix: Array<{ scores: Record<PracticeArchetype, number>; margin: number; guaranteedMargin: number; coverage: string; confidence: string; subclass: string | null }>; subclassQuality: { summary: Record<string, number> } };
  const holdoutArtifact = JSON.parse(await readFile(path.resolve("artifacts/game-v2-benchmark/benchmark-v23-holdout.json"), "utf8")) as { profiles: Array<{ scores: Record<PracticeArchetype, number>; observedMargin: number; guaranteedMargin: number; coverage: string; gap: string; confidence: string; subclass: string | null }> };
  const holdoutQualityArtifact = JSON.parse(await readFile(path.resolve("artifacts/game-v2-benchmark/holdout-evaluation-v23.json"), "utf8")) as { evaluation: { summary: Record<string, number> } };
  const originalCoverage = new Map<string, { coverage: string; gap: string }>();
  for (const file of (await readdir(path.resolve("artifacts/game-v2-benchmark/inputs-v21"))).filter((item) => item.endsWith(".json"))) {
    const stored = JSON.parse(await readFile(path.resolve("artifacts/game-v2-benchmark/inputs-v21", file), "utf8")) as StoredInput & { profile: { username: string } };
    originalCoverage.set(stored.profile.username.toLowerCase(), { coverage: stored.evidence.coverage.coverage, gap: stored.evidence.coverage.gap ?? "none" });
  }
  const calibratedRows = (calibrationArtifact.matrix as Array<(typeof calibrationArtifact.matrix)[number] & { username: string }>).map((item) => ({ ...item, gap: originalCoverage.get(item.username.toLowerCase())?.gap ?? "none" }));
  const cohortMetrics = (items: Array<{ scores: Record<PracticeArchetype, number>; margin: number; guaranteedMargin: number; coverage: string; gap?: string; confidence: string; subclass: string | null }>, ratings: Record<string, number>) => ({
    profiles: items.length, subclassRate: round(100 * items.filter((item) => item.subclass !== null).length / items.length, 1), nullRate: round(100 * items.filter((item) => item.subclass === null).length / items.length, 1),
    GOOD: ratings.GOOD ?? 0, ACCEPTABLE: ratings.ACCEPTABLE ?? 0, QUESTIONABLE: ratings.QUESTIONABLE ?? 0, BAD: ratings.BAD ?? 0,
    avgTopScore: average(items.map((item) => Math.max(...Object.values(item.scores)))), avgMargin: average(items.map((item) => item.margin)), avgGuaranteedMargin: average(items.map((item) => item.guaranteedMargin)),
    fullCoverage: items.filter((item) => item.coverage === "full").length, partialSmall: items.filter((item) => item.coverage === "partial-small" || (item.coverage === "partial" && item.gap === "small")).length,
    partialLarge: items.filter((item) => item.coverage === "partial-large" || (item.coverage === "partial" && item.gap === "large")).length, highConfidence: items.filter((item) => item.confidence === "high").length,
  });
  const analysis = {
    generatedAt: new Date().toISOString(), stage: "3E-G0-ANALYSIS", matrixFreezeVerified: true, tunablesChangedBeforeG0: false, profiles: profiles.length,
    subclassRate: round(100 * profiles.filter((item) => item.subclass !== null).length / profiles.length, 1), nullRate: round(100 * profiles.filter((item) => item.subclass === null).length / profiles.length, 1),
    subclassDistribution: distribution(profiles.map((item) => item.subclass ?? "null")), leaderDistribution: distribution(profiles.map((item) => item.top1)), coverage: distribution(profiles.map((item) => item.coverage)), confidence: distribution(profiles.map((item) => item.confidence)),
    quality: { pending: human.length !== profiles.length, summary: quality }, nullBlockers: distribution(profiles.filter((item) => item.subclass === null).map((item) => blocker(item.v2))),
    partialSmall: { total: partialSmall.length, safe: partialSmall.filter((item) => item.safeWinner).length, unsafe: partialSmall.filter((item) => !item.safeWinner).length, subclasses: partialSmall.filter((item) => item.subclass !== null).length, blockedByOtherGate: partialSmall.filter((item) => item.safeWinner && item.subclass === null).length, profiles: partialSmall.map((item) => ({ username: item.username, top1: item.top1, top1Observed: item.scores[item.top1], top1Lower: round(item.v2.archetypes.find((entry) => entry.archetype === item.top1)?.lowerBound ?? 0), top2: item.top2, top2Upper: round(item.v2.archetypes.find((entry) => entry.archetype === item.top2)?.upperBound ?? 0), guaranteedMargin: item.guaranteedMargin, confidence: item.confidence, subclass: item.subclass, reasonCode: item.reasonCode })) },
    reachability,
    competition: Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => [archetype, distribution(profiles.filter((item) => item.top1 === archetype).map((item) => item.top2))])), correlations,
    excessiveCorrelations: ARCHETYPE_ORDER.flatMap((left, index) => ARCHETYPE_ORDER.slice(index + 1).flatMap((right) => Math.abs(correlations[left][right]) >= .75 ? [{ left, right, value: correlations[left][right] }] : [])),
    composites: { activationsByArchetype: Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => [archetype, profiles.filter((item) => item.compositeSignals[archetype].length > 0).length])), totalActivations: profiles.reduce((sum, item) => sum + ARCHETYPE_ORDER.reduce((inner, archetype) => inner + item.compositeSignals[archetype].length, 0), 0) },
    evolutions: { unlocks: profiles.filter((item) => item.evolution !== null).length, tuningPerformed: false }, titles: { observed: distribution(profiles.flatMap((item) => item.titles)), tuningPerformed: false }, achievements: { observedUnlocked: distribution(profiles.flatMap((item) => item.achievements)), catalogOrGateChanges: 0 },
    genericCap: { cap: V2_BALANCE.genericSignalCap, profileTopScoreDeltas: profiles.map((item) => ({ username: item.username, original: item.scores[item.top1], withoutCap: round(item.withoutGenericCap[item.top1] ?? 0), delta: round((item.withoutGenericCap[item.top1] ?? 0) - item.scores[item.top1]) })).filter((item) => item.delta !== 0), meanAbsoluteDeltaAllArchetypes: average(profiles.flatMap((item) => ARCHETYPE_ORDER.map((archetype) => Math.abs((item.withoutGenericCap[archetype] ?? 0) - item.scores[archetype])))) },
    specificity: { meanAbsoluteDeltaUniform: average(profiles.flatMap((item) => ARCHETYPE_ORDER.map((archetype) => Math.abs((item.uniformSpecificity[archetype] ?? 0) - item.scores[archetype])))), dominantTechnologies: distribution(profiles.flatMap((item) => [...item.schools, ...item.artifacts].filter((technology) => technology.score >= 55).map((technology) => technology.id))) },
    scoreDistribution: Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => [archetype, distribution(profiles.map((item) => scoreBucket(item.scores[archetype])))])), topScoreDistribution: distribution(profiles.map((item) => scoreBucket(item.scores[item.top1]))), marginDistribution: distribution(profiles.map((item) => marginBucket(item.observedMargin))), guaranteedMarginDistribution: distribution(profiles.map((item) => guaranteedMarginBucket(item.guaranteedMargin))),
    confidenceByWinner: Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => [archetype, distribution(profiles.filter((item) => item.top1 === archetype).map((item) => item.confidence))])),
    comparison: {
      calibration: cohortMetrics(calibratedRows, calibrationArtifact.subclassQuality.summary),
      holdout: cohortMetrics(holdoutArtifact.profiles.map((item) => ({ ...item, margin: item.observedMargin })), holdoutQualityArtifact.evaluation.summary),
      independent: cohortMetrics(profiles.map((item) => ({ scores: item.scores, margin: item.observedMargin, guaranteedMargin: item.guaranteedMargin, coverage: item.coverage, gap: item.gap, confidence: item.confidence, subclass: item.subclass })), quality),
    },
    determinism: `${profiles.filter((item) => item.deterministicReplay).length}/${profiles.length}`, performance: { coldP90Ms: percentile(profiles.map((item) => item.coldLatencyMs), .9), engineP90Ms: round(percentile(profiles.map((item) => item.engineMs), .9)) },
    requestBudget: { restP90: percentile(profiles.map((item) => item.requests.rest), .9), graphqlP90: percentile(profiles.map((item) => item.requests.graphql), .9), maxRest: Math.max(...profiles.map((item) => item.requests.rest)), maxGraphql: Math.max(...profiles.map((item) => item.requests.graphql)), withinCollectorCaps: profiles.every((item) => item.requests.reposInspected <= V2_BALANCE.maxRepositories && item.requests.manifestFetches <= V2_BALANCE.maxManifestsPerProfile) },
  };
  await writeFile(path.join(root, "g0-results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await writeFile(path.join(root, "g0-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ subclassRate: analysis.subclassRate, distribution: analysis.subclassDistribution, coverage: analysis.coverage, confidence: analysis.confidence, quality: analysis.quality, nullBlockers: analysis.nullBlockers, partialSmall: analysis.partialSmall, reachability, excessiveCorrelations: analysis.excessiveCorrelations, composites: analysis.composites, genericCap: analysis.genericCap, specificity: analysis.specificity, comparison: analysis.comparison, determinism: analysis.determinism, requestBudget: analysis.requestBudget }, null, 2));
}

async function finalizeHoldout(): Promise<void> {
  const lockedEvaluation = JSON.parse(await readFile(path.resolve("artifacts/game-v2-benchmark/holdout-evaluation-v23.json"), "utf8")) as { evaluation: { summary: Record<string, number>; goodOrAcceptablePercent: number; badPercent: number }; profiles: Array<{ username: string; evaluation: { username: string; rating: string; note: string } }> };
  const evaluationByName = new Map(lockedEvaluation.profiles.map((item) => [item.username.toLowerCase(), item.evaluation]));
  const rows = [];
  for (const file of (await readdir(path.resolve("artifacts/game-v2-benchmark/inputs-v21"))).filter((item) => item.endsWith(".json")).sort()) {
    const stored = JSON.parse(await readFile(path.resolve("artifacts/game-v2-benchmark/inputs-v21", file), "utf8")) as { profile: { username: string; cohort: string }; rawProfile: unknown; evidence: TechnologyEvidenceProfile };
    if (stored.profile.cohort !== "holdout") continue;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const v2 = createRPGCharacterV2({ profile, evidence }); const replay = createRPGCharacterV2({ profile, evidence });
    const ordered = [...v2.archetypes].sort((a, b) => (b.observedScore ?? -1) - (a.observedScore ?? -1) || ARCHETYPE_ORDER.indexOf(a.archetype) - ARCHETYPE_ORDER.indexOf(b.archetype));
    rows.push({ username: stored.profile.username, top1: ordered[0].archetype, top1Score: round(ordered[0].observedScore ?? 0), top2: ordered[1].archetype, observedMargin: round((ordered[0].observedScore ?? 0) - (ordered[1].observedScore ?? 0)), guaranteedMargin: round(v2.subclass.guaranteedMargin ?? 0), confidence: v2.subclass.confidence, coverage: coverageLabel(evidence), subclass: v2.subclass.value, reasonCode: v2.subclass.reasonCode, evaluation: evaluationByName.get(stored.profile.username.toLowerCase()) ?? null, evolution: v2.evolution.value, titles: v2.titles.filter((item) => item.unlocked).map((item) => item.id), deterministicReplay: JSON.stringify(v2) === JSON.stringify(replay), requests: evidence.requests });
  }
  if (rows.length !== 10 || rows.some((item) => item.evaluation === null)) throw new Error("Final locked holdout replay requires ten evaluated profiles.");
  const artifact = { generatedAt: new Date().toISOString(), stage: "3E-FINAL-LOCKED-HOLDOUT", engineVersion: "2.0-experimental-v23", tuningAfterReplayAllowed: false, g1Used: false, profiles: rows, summary: { subclasses: rows.filter((item) => item.subclass !== null).length, nulls: rows.filter((item) => item.subclass === null).length, quality: lockedEvaluation.evaluation.summary, goodOrAcceptablePercent: lockedEvaluation.evaluation.goodOrAcceptablePercent, badPercent: lockedEvaluation.evaluation.badPercent, determinism: `${rows.filter((item) => item.deterministicReplay).length}/${rows.length}`, evolutionUnlocks: rows.filter((item) => item.evolution !== null).length } };
  await writeFile(path.join(root, "holdout-v24-final.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(artifact.summary, null, 2));
}

async function main() {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/inputs-v21", "artifacts/game-v2-generalization/inputs-v24"]);
  const matrix = await loadMatrix();
  if (process.argv.includes("--collect")) await collect(matrix);
  await analyze(matrix);
  if (process.argv.includes("--final-holdout")) await finalizeHoldout();
}
void main();
