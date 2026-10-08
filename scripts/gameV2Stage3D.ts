import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";
import { validateRawGitHubData } from "@/data/schemas";
import {
  ARCHETYPE_NAMES,
  ARCHETYPE_ORDER,
  ARTIFACTS,
  createRPGCharacterV2,
  normalizeRepositoryEvidence,
  SCHOOLS,
  type ArchetypeAffinity,
  type PracticeArchetype,
  type RPGCharacterV2,
  type TechnologyEvidenceProfile,
} from "@/game-v2";

type Cohort = "calibration" | "holdout";
interface StoredV21 {
  profile: { username: string; cohort: Cohort; categories: string[]; mandatory: boolean };
  rawProfile: unknown;
  evidence: TechnologyEvidenceProfile;
  collectedAt: string;
  coldLatencyMs: number;
  warmCollectorLatencyMs: number;
  scoringLatencyMs: number;
}

interface ScoreRow {
  username: string;
  className: string;
  coverage: string;
  confidence: string;
  maturity: number | null;
  schools: string[];
  artifacts: string[];
  scores: Record<PracticeArchetype, number>;
  top1: PracticeArchetype;
  top2: PracticeArchetype;
  margin: number;
  subclass: PracticeArchetype | null;
  components: Record<PracticeArchetype, Record<string, number>>;
}

const root = path.resolve("artifacts/game-v2-benchmark");
const inputs = path.join(root, "inputs-v21");
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const nameOf = (archetype: PracticeArchetype) => ARCHETYPE_NAMES[archetype].pt;

function quantile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const remainder = position - lower;
  return sorted[lower] + (sorted[lower + 1] - sorted[lower] || 0) * remainder;
}

function pearson(left: number[], right: number[]): number {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const numerator = left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftScale = Math.sqrt(left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0));
  const rightScale = Math.sqrt(right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  return leftScale === 0 || rightScale === 0 ? 0 : numerator / (leftScale * rightScale);
}

function exactContributions(archetype: PracticeArchetype, affinity: ArchetypeAffinity): Record<string, number> {
  const component = (key: string) => affinity.components[key] ?? 0;
  const raw: Record<string, number> = archetype === "architect"
    ? { structural: component("structural") * .60, maturity: component("maturity") * .15, versatility: component("versatility") * .10, quality: component("quality") * .10, automation: component("automation") * .05 }
    : archetype === "artificer"
      ? { craft: component("craft") * .60, automation: component("automation") * .15, versatility: component("versatility") * .10, maturity: component("maturity") * .15 }
      : archetype === "illusionist"
        ? { visual: component("visual") * .65, structural: component("structural") * .10, versatility: component("versatility") * .15, maturity: component("maturity") * .10 }
        : archetype === "guardian"
          ? { quality: component("quality") * .55, collaboration: component("collaboration") * .15, consistency: component("consistency") * .15, maturity: component("maturity") * .05, automation: component("automation") * .10 }
          : { automation: component("automation") * .65, consistency: component("consistency") * .15, craft: component("craft") * .10, maturity: component("maturity") * .10 };
  const toolKeys: Record<PracticeArchetype, string[]> = {
    architect: ["quality", "automation"],
    artificer: ["craft", "automation"],
    illusionist: ["visual"],
    guardian: ["quality", "automation"],
    chronomancer: ["automation", "craft"],
  };
  const tools = toolKeys[archetype];
  const toolTotal = tools.reduce((sum, key) => sum + (raw[key] ?? 0), 0);
  if (toolTotal > 40) for (const key of tools) raw[key] *= 40 / toolTotal;
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, round(value)]));
}

const technologyWeights: Record<string, Partial<Record<PracticeArchetype, number>>> = {};
for (const definition of SCHOOLS) {
  technologyWeights[definition.name] = definition.family === "meta-web" || definition.family === "backend"
    ? { architect: .60, illusionist: .10 }
    : definition.family === "ui-web" || definition.family === "mobile"
      ? { illusionist: .4875 }
      : {};
}
for (const definition of ARTIFACTS) {
  technologyWeights[definition.name] = definition.family === "build" || definition.family === "desktop" || definition.family === "toolchain"
    ? { artificer: .60, chronomancer: .10 }
    : definition.family === "testing"
      ? { architect: .10, illusionist: .1625, guardian: .55 }
      : definition.family === "visual"
        ? { illusionist: .1625 }
        : definition.family === "infra"
          ? { architect: .05, artificer: .15, guardian: .10, chronomancer: .65 }
          : {};
}
technologyWeights.maturity = { architect: .15, artificer: .15, illusionist: .10, guardian: .05, chronomancer: .10 };
technologyWeights.versatility = { architect: .10, artificer: .10, illusionist: .15 };
technologyWeights.consistency = { guardian: .15, chronomancer: .15 };
technologyWeights.collaboration = { guardian: .15 };

function overlapClass(weights: Partial<Record<PracticeArchetype, number>>): string {
  const significant = Object.values(weights).filter((weight) => (weight ?? 0) >= .10).sort((a, b) => b - a);
  if (significant.length <= 1) return "exclusive";
  if (significant.length === 2 && significant[0] >= significant[1] * 2) return "mostly-specific";
  if (significant.length <= 3) return "shared";
  return "overly-generic";
}

function markdownTable(headers: string[], rows: Array<Array<string | number>>): string {
  return [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|_").replaceAll("_", "")}|`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

async function loadCalibration(): Promise<Array<{ stored: StoredV21; v2: RPGCharacterV2 }>> {
  const files = (await readdir(inputs)).filter((file) => file.endsWith(".json")).sort();
  const calibration: Array<{ stored: StoredV21; v2: RPGCharacterV2 }> = [];
  for (const file of files) {
    const stored = JSON.parse(await readFile(path.join(inputs, file), "utf8")) as StoredV21;
    if (stored.profile.cohort !== "calibration") continue;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    calibration.push({ stored, v2: createRPGCharacterV2({ profile, evidence }) });
  }
  if (calibration.length !== 30) throw new Error(`Stage 3D R0 requires exactly 30 calibration profiles; found ${calibration.length}.`);
  return calibration;
}

async function main() {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/inputs-v21"]);
  const calibration = await loadCalibration();
  const rows: ScoreRow[] = calibration.map(({ stored, v2 }) => {
    const ordered = [...v2.archetypes].sort((a, b) => (b.observedScore ?? -1) - (a.observedScore ?? -1) || ARCHETYPE_ORDER.indexOf(a.archetype) - ARCHETYPE_ORDER.indexOf(b.archetype));
    const scores = Object.fromEntries(v2.archetypes.map((item) => [item.archetype, round(item.observedScore ?? 0)])) as Record<PracticeArchetype, number>;
    return {
      username: stored.profile.username,
      className: v2.class.value,
      coverage: v2.subclass.coverage,
      confidence: v2.subclass.confidence,
      maturity: v2.archetypes[0]?.components.maturity ?? null,
      schools: v2.explanation.schools.filter((item) => item.evidenceRepoCount > 0).map((item) => item.name),
      artifacts: v2.explanation.artifacts.filter((item) => item.evidenceRepoCount > 0).map((item) => item.name),
      scores,
      top1: ordered[0].archetype,
      top2: ordered[1].archetype,
      margin: round((ordered[0].observedScore ?? 0) - (ordered[1].observedScore ?? 0)),
      subclass: v2.subclass.value,
      components: Object.fromEntries(v2.archetypes.map((item) => [item.archetype, exactContributions(item.archetype, item)])) as Record<PracticeArchetype, Record<string, number>>,
    };
  });

  const scoreDistributions = Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => {
    const values = rows.map((row) => row.scores[archetype]);
    return [archetype, {
      mean: round(values.reduce((sum, value) => sum + value, 0) / values.length), median: round(quantile(values, .5)),
      p25: round(quantile(values, .25)), p50: round(quantile(values, .5)), p75: round(quantile(values, .75)), p90: round(quantile(values, .90)),
      min: round(Math.min(...values)), max: round(Math.max(...values)),
      atLeast40: values.filter((value) => value >= 40).length, atLeast50: values.filter((value) => value >= 50).length,
      atLeast60: values.filter((value) => value >= 60).length, atLeast70: values.filter((value) => value >= 70).length,
    }];
  }));
  const correlations = Object.fromEntries(ARCHETYPE_ORDER.map((left) => [left, Object.fromEntries(ARCHETYPE_ORDER.map((right) => [right, round(pearson(rows.map((row) => row.scores[left]), rows.map((row) => row.scores[right])), 3)]))]));
  const marginBuckets = [
    { label: "0–2", test: (value: number) => value <= 2 },
    { label: ">2–4", test: (value: number) => value > 2 && value <= 4 },
    { label: ">4–6", test: (value: number) => value > 4 && value <= 6 },
    { label: ">6–8", test: (value: number) => value > 6 && value <= 8 },
    { label: ">8–12", test: (value: number) => value > 8 && value <= 12 },
    { label: ">12–20", test: (value: number) => value > 12 && value <= 20 },
    { label: ">20", test: (value: number) => value > 20 },
  ].map(({ label, test }) => { const count = rows.filter((row) => test(row.margin)).length; return { label, count, percent: round(100 * count / rows.length, 1) }; });
  const contributionMatrix = Object.entries(technologyWeights).map(([signal, weights]) => ({ signal, weights, overlap: overlapClass(weights), significantArchetypes: ARCHETYPE_ORDER.filter((archetype) => (weights[archetype] ?? 0) >= .10) }));
  const ambiguous = [...rows].sort((a, b) => a.margin - b.margin || a.username.localeCompare(b.username, "en")).slice(0, 10);
  const clear = [...rows].sort((a, b) => b.margin - a.margin || a.username.localeCompare(b.username, "en")).slice(0, 10);
  const excessiveCorrelations = ARCHETYPE_ORDER.flatMap((left, leftIndex) => ARCHETYPE_ORDER.slice(leftIndex + 1).map((right) => ({ left, right, value: correlations[left][right] }))).filter((item) => item.value >= .75);
  const issueCounts = {
    signalOverlap: contributionMatrix.filter((item) => item.overlap === "shared" || item.overlap === "overly-generic").length,
    weakSpecificity: contributionMatrix.filter((item) => item.overlap === "shared" && Math.max(...Object.values(item.weights).map((value) => value ?? 0)) <= .20).length,
    saturation: ARCHETYPE_ORDER.filter((archetype) => scoreDistributions[archetype].atLeast70 >= 10).length,
    threshold: rows.filter((row) => row.scores[row.top1] >= 50 && row.scores[row.top1] < 55 && row.margin >= 5).length,
    margin: rows.filter((row) => row.scores[row.top1] >= 55 && row.margin < 5).length,
    confidence: rows.filter((row) => row.scores[row.top1] >= 55 && row.margin >= 5 && row.confidence === "low").length,
    legitimateAmbiguity: rows.filter((row) => row.margin <= 2).length,
  };

  const analysis = {
    generatedAt: new Date().toISOString(), stage: "3D-R0-ANALYSIS-ONLY", cohort: "calibration", holdoutRead: false,
    engineVersion: calibration[0]?.v2.engineVersion, balanceVersion: calibration[0]?.v2.balanceVersion,
    totals: { profiles: rows.length, subclasses: rows.filter((row) => row.subclass !== null).length },
    scoreMatrix: rows, scoreDistributions, correlations, excessiveCorrelations, marginBuckets,
    contributionMatrix, overlapCriteria: {
      significant: "formula coefficient >= 0.10",
      exclusive: "one significant archetype",
      mostlySpecific: "two significant archetypes and dominant coefficient >= 2x runner-up",
      shared: "two or three significant archetypes without dominant 2x separation",
      overlyGeneric: "four or five significant archetypes",
    },
    ambiguous, clear, issueCounts,
  };
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "benchmark-v23-r0-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`, "utf8");

  const distributionRows = ARCHETYPE_ORDER.map((archetype) => {
    const item = scoreDistributions[archetype];
    return [nameOf(archetype), item.mean, item.median, item.p25, item.p50, item.p75, item.p90, item.min, item.max, item.atLeast40, item.atLeast50, item.atLeast60, item.atLeast70];
  });
  const matrixRows = ARCHETYPE_ORDER.map((left) => [nameOf(left), ...ARCHETYPE_ORDER.map((right) => correlations[left][right])]);
  const signalRows = contributionMatrix.map((item) => [item.signal, ...ARCHETYPE_ORDER.map((archetype) => item.weights[archetype] ?? "—"), item.overlap]);
  const caseRows = (cases: ScoreRow[]) => cases.map((row) => [row.username, nameOf(row.top1), row.scores[row.top1], nameOf(row.top2), row.scores[row.top2], row.margin, Object.entries(row.components[row.top1]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, value]) => `${key} ${value}`).join("; "), Object.entries(row.components[row.top2]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, value]) => `${key} ${value}`).join("; ")]);
  const md = `# Archetype Signal Analysis R0\n\n> Etapa 3D, analysis-only. Fonte: somente os 30 perfis de calibration congelados. O holdout não foi carregado. Nenhum peso, threshold, margem ou gate foi alterado.\n\n## Score distributions\n\n${markdownTable(["Arquétipo", "Mean", "Median", "P25", "P50", "P75", "P90", "Min", "Max", ">=40", ">=50", ">=60", ">=70"], distributionRows)}\n\n## Correlation matrix\n\n${markdownTable(["", ...ARCHETYPE_ORDER.map(nameOf)], matrixRows)}\n\nCorrelações excessivas (critério diagnóstico >= 0,75): ${excessiveCorrelations.length ? excessiveCorrelations.map((item) => `${nameOf(item.left)} × ${nameOf(item.right)} = ${item.value}`).join("; ") : "nenhuma"}.\n\n## Margin distribution\n\n${markdownTable(["Bucket", "Quantidade", "%"], marginBuckets.map((item) => [item.label, item.count, item.percent]))}\n\n## Contribution matrix\n\nCoeficientes abaixo são rotas da fórmula, não pontos fixos. Sinal significativo: coeficiente >= 0,10.\n\n${markdownTable(["Evidência/componente", ...ARCHETYPE_ORDER.map(nameOf), "Overlap"], signalRows)}\n\n## Top 10 ambiguous cases\n\n${markdownTable(["Perfil", "Top 1", "Score", "Top 2", "Score", "Margem", "Componentes top 1", "Componentes top 2"], caseRows(ambiguous))}\n\n## Top 10 clear cases\n\n${markdownTable(["Perfil", "Top 1", "Score", "Top 2", "Score", "Margem", "Componentes top 1", "Componentes top 2"], caseRows(clear))}\n\n## Diagnosis\n\n- A) signal overlap: ${issueCounts.signalOverlap}\n- B) weak specificity: ${issueCounts.weakSpecificity}\n- C) saturation issue: ${issueCounts.saturation}\n- D) threshold issue: ${issueCounts.threshold}\n- E) margin issue: ${issueCounts.margin}\n- F) confidence issue: ${issueCounts.confidence}\n- G) legitimate ambiguity: ${issueCounts.legitimateAmbiguity}\n\nO modelo atual diferencia famílias amplas, mas reutiliza testing em Arquiteto/Ilusionista/Guardião e infra em quatro arquétipos. Maturidade aparece nos cinco arquétipos e eleva scores sem aumentar identidade técnica. Presence, recurrence, dominance e ecosystem pattern ainda não são componentes explícitos na fórmula de arquétipo. O R1 deve priorizar especificidade e caps de sinais genéricos antes de qualquer ajuste de threshold/margem.\n`;
  await writeFile(path.resolve("docs/research/ARCHETYPE_SIGNAL_ANALYSIS_R0.md"), md, "utf8");
  console.log(JSON.stringify({ output: "ARCHETYPE_SIGNAL_ANALYSIS_R0.md", artifact: "benchmark-v23-r0-analysis.json", profiles: rows.length, issueCounts, excessiveCorrelations }, null, 2));
}

void main();
