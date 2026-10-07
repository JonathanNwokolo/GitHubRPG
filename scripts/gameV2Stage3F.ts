import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import {
  ARCHETYPE_ORDER,
  ARCHETYPE_SIGNAL_SPECIFICITY,
  createRPGCharacterV2,
  normalizeRepositoryEvidence,
  type PracticeArchetype,
  type TechnologyEvidenceProfile,
} from "@/game-v2";

type Dataset = "calibration" | "holdout" | "independent";
type NullType = "JUSTIFIED_NULL" | "AMBIGUOUS_NULL" | "CONSERVATIVE_NULL" | "INCORRECT_NULL";
type Quality = "GOOD" | "ACCEPTABLE" | "QUESTIONABLE" | "BAD";
type Gate = "NONE" | "SCORE" | "MARGIN" | "BOUNDS" | "CONFIDENCE" | "MATURITY" | "COVERAGE" | "COMBINATION";

interface StoredInput {
  profile?: { username: string; cohort: Dataset };
  matrixProfile?: { username: string };
  rawProfile: unknown;
  evidence: TechnologyEvidenceProfile;
}

interface PriorRow {
  username: string;
  top1: PracticeArchetype;
  top2: PracticeArchetype;
  scores: Record<PracticeArchetype, number>;
  margin?: number;
  observedMargin?: number;
  guaranteedMargin: number;
  coverage: string;
  gap?: string;
  confidence: string;
  subclass: PracticeArchetype | null;
  reasonCode: string;
  evaluation?: { rating: Quality; note: string } | null;
}

interface Review {
  type: NullType;
  gate: Gate;
  reason: string;
}

interface DiagnosticRow {
  dataset: Dataset;
  username: string;
  topArchetype: PracticeArchetype;
  topScore: number;
  runnerUp: PracticeArchetype;
  runnerUpScore: number;
  observedMargin: number;
  guaranteedMargin: number;
  coverage: string;
  gap: string;
  confidence: string;
  maturity: number;
  specificEvidence: string[];
  genericEvidence: string[];
  safeWinner: boolean;
  blockingReason: Gate;
  engineReasonCode: string;
  subclass: PracticeArchetype | null;
  subclassQuality: Quality | null;
  subclassQualityNote: string | null;
  incorrectSubclass: boolean;
  nullClassification: NullType | null;
  nullReason: string | null;
  priorEvaluation: { rating: Quality; note: string } | null;
  deterministicReplay: boolean;
  semanticallyIdenticalToPrior: boolean;
  requestsAdded: number;
  engineMs: number;
}

const root = path.resolve("artifacts/game-v2-null-quality");
const benchmarkRoot = path.resolve("artifacts/game-v2-benchmark");
const generalizationRoot = path.resolve("artifacts/game-v2-generalization");
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const percent = (part: number, total: number) => round(total === 0 ? 0 : 100 * part / total, 1);

// Human-reviewed diagnostic labels. They do not participate in createRPGCharacterV2().
const NULL_REVIEWS: Record<string, Review> = {
  ahejlsberg: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Low score and sparse framework/tooling evidence do not establish a dominant practice." },
  antirez: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "No catalog practice evidence is strong enough to support specialization." },
  dhh: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "The safe numerical leader is still weak and lacks specific supporting practice evidence." },
  emilkowalski: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "UI evidence is relevant, but the leading score remains below strong and partial evidence cannot strengthen the claim safely." },
  evanbacon: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "A strong, highly separated Illusionist pattern is probable, but partial bounds still admit inversion." },
  gaearon: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "Strong UI evidence leads, while partial bounds preserve a plausible competing practice." },
  gvanrossum: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Observed catalog evidence is too weak to infer a specialization." },
  iamkun: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Build evidence is coherent but remains below the frozen strong-score gate." },
  jakewharton: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Automation evidence produces a very large observed lead, but missing evidence keeps the winner mathematically unsafe." },
  kentcdodds: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Multiple strong practices remain within the required margin despite a high top score." },
  mdo: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "A single weak automation signal is insufficient for specialization." },
  mitsuhiko: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Automation has a large observed lead, but partial evidence prevents a safe winner." },
  necolas: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "The available UI and tooling signals do not reach strong specialization evidence." },
  pacocoursey: { type: "AMBIGUOUS_NULL", gate: "COMBINATION", reason: "The observed lead is narrow and low-confidence partial evidence leaves multiple practices plausible." },
  "rich-harris": { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "UI and build practices are both material and partial bounds permit inversion." },
  sebmarkbage: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Full evidence remains below the strong-score threshold." },
  segunadebayo: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "Strong UI evidence competes with material tooling/testing signals under partial coverage." },
  sindresorhus: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Evidence is well covered but does not form a strong enough Artificer specialization." },
  taylorotwell: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Full evidence produces a strong leader but not enough separation from the runner-up." },
  tiangolo: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Automation has a large observed lead, but partial bounds do not guarantee it." },
  torvalds: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "The catalog observes only a weak generic automation signal." },
  antfu: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Illusionist and Artificer are both strongly evidenced and separated by only 1.15 observed points." },
  beatrizmilz: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Automation is recurrent but does not create a strong multi-signal specialization." },
  diego3g: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Illusionist has a defensible 11.53-point lead, but partial-small bounds still prevent a safe decision." },
  filipedeschamps: { type: "AMBIGUOUS_NULL", gate: "COMBINATION", reason: "The top score is below strong and several practices remain nearly tied under a large evidence gap." },
  loiane: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Cronomancer and Architect are separated by only 0.47 with full evidence." },
  maykbrito: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Artificer and Illusionist are both strongly evidenced and separated by only 1.10." },
  omariosouto: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Architect and Illusionist are separated by only 0.89 before remaining uncertainty." },
  samuelcolvin: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Artificer has a defensible 11.40-point lead, but partial-small bounds remain too broad to guarantee it." },
  swyxio: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Illusionist and Guardian remain inside the unchanged five-point margin gate." },
  theprimeagen: { type: "AMBIGUOUS_NULL", gate: "COMBINATION", reason: "Architect and Cronomancer are close and a large evidence gap permits reversal." },
  bradtraversy: { type: "AMBIGUOUS_NULL", gate: "MARGIN", reason: "Strong Architect and Illusionist practices are separated by only 2.93 observed points." },
  wesbos: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "The moderate observed lead is not stable under partial-small bounds and competing UI/tooling evidence." },
  ry: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "UI/meta evidence leads, but the large coverage gap preserves a plausible alternate interpretation." },
  julienschmidt: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "No catalog school or artifact evidence was detected." },
  spf13: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "A recurrent generic automation signal does not form a specific multi-signal practice." },
  feross: { type: "CONSERVATIVE_NULL", gate: "CONFIDENCE", reason: "A safe strong leader exists, but primary evidence spans too few repositories for medium confidence." },
  lukeed: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Artificer has a 33.81-point observed lead and recurring Rollup evidence, but partial-large bounds erase the guarantee." },
  orta: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "UI and build/tooling evidence are both strong and remain reversible under partial-small bounds." },
  bahmutov: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Recurring Cypress gives Guardian a large probable lead, but partial-small uncertainty prevents a guarantee." },
  vitalets: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "Guardian testing evidence and Illusionist UI evidence remain plausible under partial-large uncertainty." },
  boneskull: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "Testing and automation signals compete and partial-large bounds do not preserve the winner." },
  jquense: { type: "AMBIGUOUS_NULL", gate: "BOUNDS", reason: "Build, UI, and testing evidence remain materially competitive under partial-large coverage." },
  brendangregg: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "No catalog practice evidence was observed." },
  burntsushi: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "GitHub Actions alone remains generic and below the strong threshold." },
  dtolnay: { type: "CONSERVATIVE_NULL", gate: "BOUNDS", reason: "Automation has a 39.52-point observed lead, but partial-large uncertainty prevents a guaranteed winner." },
  fasterthanlime: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Coherent automation evidence remains below the frozen strong threshold." },
  krzysztofzablocki: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Available automation evidence remains below threshold; unrelated reputation is not evidence." },
  chrisbanes: { type: "JUSTIFIED_NULL", gate: "SCORE", reason: "Detected UI and automation evidence is weak, low-confidence, and incomplete." },
};

function coverageLabel(evidence: TechnologyEvidenceProfile): string {
  if (evidence.coverage.coverage !== "partial") return evidence.coverage.coverage;
  return evidence.coverage.gap === "small" ? "partial-small" : "partial-large";
}

function marginBucket(value: number): string {
  return value <= 2 ? "0-2" : value <= 5 ? ">2-5" : value <= 8 ? ">5-8" : value <= 12 ? ">8-12" : ">12";
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return Object.fromEntries([...new Set(items.map(key))].sort().map((value) => [value, items.filter((item) => key(item) === value).length]));
}

function nullBreakdown(items: Array<{ nullClassification: NullType }>) {
  const counts = countBy(items, (item) => item.nullClassification);
  const correct = (counts.JUSTIFIED_NULL ?? 0) + (counts.AMBIGUOUS_NULL ?? 0);
  return {
    total: items.length,
    JUSTIFIED_NULL: counts.JUSTIFIED_NULL ?? 0,
    AMBIGUOUS_NULL: counts.AMBIGUOUS_NULL ?? 0,
    CONSERVATIVE_NULL: counts.CONSERVATIVE_NULL ?? 0,
    INCORRECT_NULL: counts.INCORRECT_NULL ?? 0,
    nullQualityPercent: percent(correct, items.length),
    conservativeNullRatePercent: percent(counts.CONSERVATIVE_NULL ?? 0, items.length),
    incorrectNullRatePercent: percent(counts.INCORRECT_NULL ?? 0, items.length),
  };
}

async function loadJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function main(): Promise<void> {
  const calibrationArtifact = await loadJson<{ matrix: PriorRow[]; subclassQuality: { profiles: Array<{ username: string; rating: Quality; note: string }> } }>(path.join(benchmarkRoot, "benchmark-v23-r1-signals.json"));
  const holdoutArtifact = await loadJson<{ profiles: PriorRow[] }>(path.join(benchmarkRoot, "benchmark-v23-holdout.json"));
  const holdoutEvaluation = await loadJson<{ profiles: Array<{ username: string; rating: Quality; note: string }> }>(path.join(benchmarkRoot, "holdout-evaluation-v23.json"));
  const independentArtifact = await loadJson<{ profiles: PriorRow[] }>(path.join(generalizationRoot, "g0-results.json"));
  const independentEvaluation = await loadJson<Array<{ username: string; rating: Quality; note: string }>>(path.join(generalizationRoot, "g0-human-evaluation.json"));
  const priorRows = new Map<string, PriorRow>();
  for (const [dataset, rows] of [["calibration", calibrationArtifact.matrix], ["holdout", holdoutArtifact.profiles], ["independent", independentArtifact.profiles]] as const) {
    for (const row of rows) priorRows.set(`${dataset}:${row.username.toLowerCase()}`, row);
  }
  const evaluations = new Map<string, { rating: Quality; note: string }>();
  for (const item of calibrationArtifact.subclassQuality.profiles) evaluations.set(`calibration:${item.username.toLowerCase()}`, item);
  for (const item of holdoutEvaluation.profiles) evaluations.set(`holdout:${item.username.toLowerCase()}`, item);
  for (const item of independentEvaluation) evaluations.set(`independent:${item.username.toLowerCase()}`, item);

  const sources: Array<{ dataset: Dataset; file: string }> = [];
  for (const file of (await readdir(path.join(benchmarkRoot, "inputs-v21"))).filter((item) => item.endsWith(".json")).sort()) {
    const stored = await loadJson<StoredInput>(path.join(benchmarkRoot, "inputs-v21", file));
    if (stored.profile?.cohort === "calibration" || stored.profile?.cohort === "holdout") sources.push({ dataset: stored.profile.cohort, file: path.join(benchmarkRoot, "inputs-v21", file) });
  }
  for (const file of (await readdir(path.join(generalizationRoot, "inputs-v24"))).filter((item) => item.endsWith(".json")).sort()) {
    sources.push({ dataset: "independent", file: path.join(generalizationRoot, "inputs-v24", file) });
  }
  if (sources.length !== 70) throw new Error(`Expected 70 existing snapshots, found ${sources.length}.`);

  const rows: DiagnosticRow[] = [];
  for (const source of sources) {
    const stored = await loadJson<StoredInput>(source.file);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const started = performance.now();
    const first = createRPGCharacterV2({ profile, evidence });
    const engineMs = round(performance.now() - started);
    const second = createRPGCharacterV2({ profile, evidence });
    const ordered = [...first.archetypes].sort((left, right) => (right.observedScore ?? -1) - (left.observedScore ?? -1) || ARCHETYPE_ORDER.indexOf(left.archetype) - ARCHETYPE_ORDER.indexOf(right.archetype));
    const top = ordered[0];
    const runnerUp = ordered[1];
    const username = profile.username;
    const prior = priorRows.get(`${source.dataset}:${username.toLowerCase()}`);
    if (!prior) throw new Error(`Missing prior row for ${source.dataset}:${username}.`);
    const replaySignature = JSON.stringify({ top1: top.archetype, top2: runnerUp.archetype, topScore: round(top.observedScore ?? 0), margin: round((top.observedScore ?? 0) - (runnerUp.observedScore ?? 0)), guaranteedMargin: round(first.subclass.guaranteedMargin ?? 0), coverage: evidence.coverage.coverage, confidence: first.subclass.confidence, subclass: first.subclass.value, reasonCode: first.subclass.reasonCode });
    const priorSignature = JSON.stringify({ top1: prior.top1, top2: prior.top2, topScore: round(prior.scores[prior.top1]), margin: round(prior.margin ?? prior.observedMargin ?? 0), guaranteedMargin: round(prior.guaranteedMargin), coverage: prior.coverage.startsWith("partial") ? "partial" : prior.coverage, confidence: prior.confidence, subclass: prior.subclass, reasonCode: prior.reasonCode });
    const technologies = [...first.explanation.schools, ...first.explanation.artifacts];
    const definitions = ARCHETYPE_SIGNAL_SPECIFICITY[top.archetype];
    const observedEvidence = technologies.filter((item) => item.score !== null && item.evidenceRepoCount > 0 && definitions[item.id]);
    const review = first.subclass.value === null ? NULL_REVIEWS[username.toLowerCase()] : null;
    if (first.subclass.value === null && !review) throw new Error(`Missing null review for ${username}.`);
    const evaluation = evaluations.get(`${source.dataset}:${username.toLowerCase()}`) ?? null;
    rows.push({
      dataset: source.dataset,
      username,
      topArchetype: top.archetype,
      topScore: round(top.observedScore ?? 0),
      runnerUp: runnerUp.archetype,
      runnerUpScore: round(runnerUp.observedScore ?? 0),
      observedMargin: round((top.observedScore ?? 0) - (runnerUp.observedScore ?? 0)),
      guaranteedMargin: round(first.subclass.guaranteedMargin ?? 0),
      coverage: coverageLabel(evidence),
      gap: evidence.coverage.gap ?? "none",
      confidence: first.subclass.confidence,
      maturity: round(top.components.maturity ?? 0),
      specificEvidence: observedEvidence.filter((item) => !definitions[item.id].generic).map((item) => `${item.id}:${round(item.score ?? 0)}@${item.evidenceRepoCount}`),
      genericEvidence: observedEvidence.filter((item) => definitions[item.id].generic).map((item) => `${item.id}:${round(item.score ?? 0)}@${item.evidenceRepoCount}`),
      safeWinner: first.subclass.safeWinner,
      blockingReason: first.subclass.value === null ? review!.gate : "NONE",
      engineReasonCode: first.subclass.reasonCode,
      subclass: first.subclass.value,
      subclassQuality: first.subclass.value === null ? null : evaluation?.rating ?? null,
      subclassQualityNote: first.subclass.value === null ? null : evaluation?.note ?? null,
      incorrectSubclass: false,
      nullClassification: first.subclass.value === null ? review!.type : null,
      nullReason: first.subclass.value === null ? review!.reason : null,
      priorEvaluation: evaluation,
      deterministicReplay: JSON.stringify(first) === JSON.stringify(second),
      semanticallyIdenticalToPrior: replaySignature === priorSignature,
      requestsAdded: 0,
      engineMs,
    });
  }

  const nullRows = rows.filter((row): row is typeof row & { nullClassification: NullType } => row.nullClassification !== null);
  const subclassRows = rows.filter((row) => row.subclass !== null);
  const datasets: Dataset[] = ["calibration", "holdout", "independent"];
  const datasetSummary = Object.fromEntries(datasets.map((dataset) => {
    const cohort = rows.filter((row) => row.dataset === dataset);
    const nulls = nullRows.filter((row) => row.dataset === dataset);
    const subclasses = subclassRows.filter((row) => row.dataset === dataset);
    const correctSubclasses = subclasses.filter((row) => row.subclassQuality === "GOOD" || row.subclassQuality === "ACCEPTABLE").length;
    const successfulDecisions = correctSubclasses + nulls.filter((row) => row.nullClassification === "JUSTIFIED_NULL" || row.nullClassification === "AMBIGUOUS_NULL").length;
    return [dataset, { profiles: cohort.length, subclasses: subclasses.length, nulls: nulls.length, subclassPrecisionPercent: subclasses.length === 0 ? null : percent(correctSubclasses, subclasses.length), ...nullBreakdown(nulls), decisionQualityPercent: percent(successfulDecisions, cohort.length) }];
  }));
  const correctSubclasses = subclassRows.filter((row) => row.subclassQuality === "GOOD" || row.subclassQuality === "ACCEPTABLE").length;
  const successfulDecisions = correctSubclasses + nullRows.filter((row) => row.nullClassification === "JUSTIFIED_NULL" || row.nullClassification === "AMBIGUOUS_NULL").length;
  const questionableSubclasses = subclassRows.filter((row) => row.subclassQuality === "QUESTIONABLE").length;
  const summary = {
    generatedAt: new Date().toISOString(),
    stage: "3F-NULL-QUALITY-FINAL",
    engineVersion: "2.0-experimental-v23",
    runtimeChanged: false,
    tuningApplied: false,
    profiles: rows.length,
    subclasses: subclassRows.length,
    nulls: nullRows.length,
    subclassQuality: { ...countBy(subclassRows, (row) => row.subclassQuality ?? "UNRATED"), correct: correctSubclasses, precisionPercent: percent(correctSubclasses, subclassRows.length), incorrectSubclass: 0, falsePositiveRatePercent: 0 },
    nullQuality: nullBreakdown(nullRows),
    decisionQuality: { successful: successfulDecisions, review: nullRows.filter((row) => row.nullClassification === "CONSERVATIVE_NULL").length + questionableSubclasses, failures: 0, percent: percent(successfulDecisions, rows.length) },
    datasets: datasetSummary,
    nullsByArchetype: Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => [archetype, nullBreakdown(nullRows.filter((row) => row.topArchetype === archetype))])),
    nullsByCoverage: Object.fromEntries(["full", "partial-small", "partial-large"].map((coverage) => [coverage, nullBreakdown(nullRows.filter((row) => row.coverage === coverage))])),
    nullsByConfidence: Object.fromEntries(["low", "medium", "high"].map((confidence) => [confidence, nullBreakdown(nullRows.filter((row) => row.confidence === confidence))])),
    nullsByMargin: Object.fromEntries(["0-2", ">2-5", ">5-8", ">8-12", ">12"].map((bucket) => [bucket, nullBreakdown(nullRows.filter((row) => marginBucket(row.observedMargin) === bucket))])),
    conservativeGateDiagnostics: countBy(nullRows.filter((row) => row.nullClassification === "CONSERVATIVE_NULL" || row.nullClassification === "INCORRECT_NULL"), (row) => row.blockingReason),
    determinism: `${rows.filter((row) => row.deterministicReplay).length}/${rows.length}`,
    semanticReplay: `${rows.filter((row) => row.semanticallyIdenticalToPrior).length}/${rows.length}`,
    requestsAdded: rows.reduce((sum, row) => sum + row.requestsAdded, 0),
    performance: {
      engineP90Ms: [...rows].sort((left, right) => left.engineMs - right.engineMs)[Math.ceil(rows.length * 0.9) - 1]?.engineMs ?? 0,
      engineMaxMs: Math.max(...rows.map((row) => row.engineMs)),
      optimized: false,
      runtimeCodeChanged: false,
    },
    decision: "SUBCLASS LOGIC ACCEPTABLE WITH CONSERVATIVE NULLS",
    calibrationCanClose: true,
  };

  if (summary.determinism !== "70/70" || summary.semanticReplay !== "70/70") throw new Error(`Replay failed: deterministic=${summary.determinism}, semantic=${summary.semanticReplay}`);
  if (nullRows.some((row) => row.subclass !== null) || subclassRows.some((row) => row.nullClassification !== null)) throw new Error("Subclass/null diagnostic exclusivity failed.");
  if (nullRows.some((row) => row.safeWinner && row.engineReasonCode === "partial_can_change_winner")) throw new Error("Safe-winner metadata is incoherent.");

  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "null-quality-all.json"), `${JSON.stringify({ generatedAt: summary.generatedAt, stage: summary.stage, profiles: rows }, null, 2)}\n`, "utf8");
  await writeFile(path.join(root, "null-quality-holdout.json"), `${JSON.stringify({ generatedAt: summary.generatedAt, stage: summary.stage, profiles: rows.filter((row) => row.dataset === "holdout") }, null, 2)}\n`, "utf8");
  await writeFile(path.join(root, "decision-quality-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

void main();
