import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { ARCHETYPE_ORDER, createRPGCharacterV2, normalizeRepositoryEvidence, V2_BALANCE, type PracticeArchetype, type RPGCharacterV2, type TechnologyEvidenceProfile } from "@/game-v2";

type Cohort = "calibration" | "holdout";
interface StoredV21 { profile: { username: string; cohort: Cohort; categories: string[]; mandatory: boolean }; rawProfile: unknown; evidence: TechnologyEvidenceProfile; collectedAt: string; coldLatencyMs: number; warmCollectorLatencyMs: number; scoringLatencyMs: number }

const root = path.resolve("artifacts/game-v2-benchmark");
const inputs = path.join(root, "inputs-v21");
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
function quantile(values: number[], fraction: number): number { const sorted = [...values].sort((a, b) => a - b); const position = (sorted.length - 1) * fraction; const lower = Math.floor(position); return sorted[lower] + (sorted[lower + 1] - sorted[lower] || 0) * (position - lower); }
function pearson(left: number[], right: number[]): number { const lm = left.reduce((a, b) => a + b, 0) / left.length; const rm = right.reduce((a, b) => a + b, 0) / right.length; const numerator = left.reduce((sum, value, index) => sum + (value - lm) * (right[index] - rm), 0); const ls = Math.sqrt(left.reduce((sum, value) => sum + (value - lm) ** 2, 0)); const rs = Math.sqrt(right.reduce((sum, value) => sum + (value - rm) ** 2, 0)); return ls && rs ? numerator / (ls * rs) : 0; }
function distribution<T extends string>(values: T[]): Record<string, number> { return Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length])); }
function contributions(archetype: PracticeArchetype, components: Record<string, number | null>): Record<string, number> {
  const value = (key: string) => components[key] ?? 0;
  const map: Record<PracticeArchetype, Record<string, number>> = {
    architect: { structural: .78 * value("structural"), maturity: .08 * value("maturity"), versatility: .07 * value("versatility"), quality: .04 * value("quality"), automation: .03 * value("automation") },
    artificer: { craft: .80 * value("craft"), maturity: .08 * value("maturity"), versatility: .07 * value("versatility"), automation: .05 * value("automation") },
    illusionist: { visual: .80 * value("visual"), maturity: .06 * value("maturity"), versatility: .06 * value("versatility"), structural: .05 * value("structural"), quality: .03 * value("quality") },
    guardian: { quality: .75 * value("quality"), collaboration: .10 * value("collaboration"), consistency: .07 * value("consistency"), maturity: .03 * value("maturity"), automation: .05 * value("automation") },
    chronomancer: { automation: .80 * value("automation"), consistency: .07 * value("consistency"), craft: .05 * value("craft"), maturity: .04 * value("maturity"), versatility: .04 * value("versatility") },
  };
  return Object.fromEntries(Object.entries(map[archetype]).map(([key, score]) => [key, round(score)]));
}

async function main() {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/inputs-v21"]);
  const files = (await readdir(inputs)).filter((file) => file.endsWith(".json")).sort();
  const profiles: Array<{ stored: StoredV21; v2: RPGCharacterV2 }> = [];
  for (const file of files) {
    const stored = JSON.parse(await readFile(path.join(inputs, file), "utf8")) as StoredV21;
    if (stored.profile.cohort !== "calibration") continue;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    profiles.push({ stored, v2: createRPGCharacterV2({ profile, evidence }) });
  }
  if (profiles.length !== 30) throw new Error(`R1 must use exactly 30 calibration profiles; found ${profiles.length}.`);
  const matrix = profiles.map(({ stored, v2 }) => {
    const ordered = [...v2.archetypes].sort((a, b) => (b.observedScore ?? -1) - (a.observedScore ?? -1) || ARCHETYPE_ORDER.indexOf(a.archetype) - ARCHETYPE_ORDER.indexOf(b.archetype));
    const scores = Object.fromEntries(v2.archetypes.map((item) => [item.archetype, round(item.observedScore ?? 0)])) as Record<PracticeArchetype, number>;
    return {
      username: stored.profile.username, className: v2.class.value, coverage: v2.subclass.coverage, confidence: v2.subclass.confidence,
      scores, top1: ordered[0].archetype, top2: ordered[1].archetype, margin: round((ordered[0].observedScore ?? 0) - (ordered[1].observedScore ?? 0)),
      lowerBound: round(ordered[0].lowerBound ?? 0), rivalUpperBound: round(v2.subclass.runnerUpUpperBound ?? 0), guaranteedMargin: round(v2.subclass.guaranteedMargin ?? 0),
      subclass: v2.subclass.value, reasonCode: v2.subclass.reasonCode,
      schools: v2.explanation.schools.filter((item) => item.evidenceRepoCount > 0).map((item) => `${item.name}:${round(item.score ?? 0)}`),
      artifacts: v2.explanation.artifacts.filter((item) => item.evidenceRepoCount > 0).map((item) => `${item.name}:${round(item.score ?? 0)}`),
      components: Object.fromEntries(v2.archetypes.map((item) => [item.archetype, contributions(item.archetype, item.components)])),
    };
  });
  const scoreDistributions = Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => { const values = matrix.map((row) => row.scores[archetype]); return [archetype, { mean: round(values.reduce((a, b) => a + b, 0) / values.length), median: round(quantile(values, .5)), p25: round(quantile(values, .25)), p50: round(quantile(values, .5)), p75: round(quantile(values, .75)), p90: round(quantile(values, .9)), min: round(Math.min(...values)), max: round(Math.max(...values)), atLeast40: values.filter((v) => v >= 40).length, atLeast50: values.filter((v) => v >= 50).length, atLeast60: values.filter((v) => v >= 60).length, atLeast70: values.filter((v) => v >= 70).length }]; }));
  const correlations = Object.fromEntries(ARCHETYPE_ORDER.map((left) => [left, Object.fromEntries(ARCHETYPE_ORDER.map((right) => [right, round(pearson(matrix.map((row) => row.scores[left]), matrix.map((row) => row.scores[right])), 3)]))]));
  const marginBuckets = distribution(matrix.map((row) => row.margin <= 2 ? "0–2" : row.margin <= 4 ? ">2–4" : row.margin <= 6 ? ">4–6" : row.margin <= 8 ? ">6–8" : row.margin <= 12 ? ">8–12" : row.margin <= 20 ? ">12–20" : ">20"));
  const topScoreBuckets = distribution(matrix.map((row) => { const score = row.scores[row.top1]; return score < 40 ? "<40" : score < 45 ? "40–44" : score < 50 ? "45–49" : score < 55 ? "50–54" : score < 60 ? "55–59" : score < 70 ? "60–69" : score < 80 ? "70–79" : "80+"; }));
  const previous = JSON.parse(await readFile(path.join(root, "benchmark-v23-r0-analysis.json"), "utf8")) as { correlations: Record<PracticeArchetype, Record<PracticeArchetype, number>>; scoreDistributions: unknown };
  const correlationDelta = Object.fromEntries(ARCHETYPE_ORDER.map((left) => [left, Object.fromEntries(ARCHETYPE_ORDER.map((right) => [right, round(correlations[left][right] - previous.correlations[left][right], 3)]))]));
  const qualityReview = [
    { username: "addyosmani", rating: "GOOD", note: "UI school plus visual ecosystem form an Ilusionista composite; generic React is not sufficient by itself." },
    { username: "jesseduffield", rating: "ACCEPTABLE", note: "Recurring pipeline and container evidence support Cronomante, with a moderate score and clear margin." },
    { username: "JonathanNwokolo", rating: "GOOD", note: "UI/mobile schools plus visual and interaction artifacts create a distinct Ilusionista pattern." },
    { username: "kelseyhightower", rating: "GOOD", note: "Docker, Terraform and GitHub Actions form a specific automation/infra composite." },
    { username: "matz", rating: "ACCEPTABLE", note: "Docker plus GitHub Actions clear the composite gate, but the evidence set is narrower than the strongest Cronomante cases." },
    { username: "mhevery", rating: "GOOD", note: "Multiple UI schools and visual/testing artifacts produce a coherent Ilusionista identity." },
    { username: "mitchellh", rating: "ACCEPTABLE", note: "GitHub Actions plus Docker establish automation, while the score remains near the strong threshold." },
    { username: "sharkdp", rating: "GOOD", note: "GitHub Actions, Docker and Terraform produce the clearest Cronomante pattern in calibration." },
    { username: "yyx990803", rating: "GOOD", note: "esbuild, Vite and Webpack provide a diverse, specific build-tooling pattern for Artífice." },
  ] as const;
  const granted = matrix.filter((row) => row.subclass !== null).map((row) => row.username).sort();
  if (qualityReview.map((item) => item.username).sort().join() !== granted.join()) throw new Error("Manual quality review must cover every granted calibration subclass exactly once.");
  const artifact = {
    generatedAt: new Date().toISOString(), stage: "3D-R1-SIGNAL-CALIBRATION", cohort: "calibration", holdoutRead: false,
    engineVersion: profiles[0]?.v2.engineVersion, balanceVersion: profiles[0]?.v2.balanceVersion,
    tunables: { subclassStrong: V2_BALANCE.subclassStrong, subclassPossible: V2_BALANCE.subclassPossible, requiredMargin: V2_BALANCE.subclassMargin, genericSignalCap: V2_BALANCE.genericSignalCap },
    scoreDistributions, correlations, correlationDelta, marginBuckets, topScoreBuckets,
    subclassDistribution: distribution(matrix.map((row) => row.subclass ?? "null")), leaderDistribution: distribution(matrix.map((row) => row.top1)),
    subclassQuality: { summary: distribution(qualityReview.map((item) => item.rating)), profiles: qualityReview },
    r2: { used: false, reason: "R1 improved discrimination and produced nine defensible subclasses. The three leaders at 50-54 have different semantics/blockers, so threshold or margin refinement is not supported as a global pattern." },
    matrix, ambiguous: [...matrix].sort((a, b) => a.margin - b.margin).slice(0, 10), clear: [...matrix].sort((a, b) => b.margin - a.margin).slice(0, 10),
    deterministic: profiles.every(({ stored, v2 }) => { const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile)); const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests }); return JSON.stringify(v2) === JSON.stringify(createRPGCharacterV2({ profile, evidence })); }),
    requestsAdded: 0,
  };
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "benchmark-v23-r1-signals.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ scoreDistributions, correlations, correlationDelta, marginBuckets, topScoreBuckets, subclassDistribution: artifact.subclassDistribution, leaderDistribution: artifact.leaderDistribution, deterministic: artifact.deterministic }, null, 2));
}

void main();
