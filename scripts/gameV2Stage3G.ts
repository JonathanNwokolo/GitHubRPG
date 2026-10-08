import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";
import { calculateAccountAge } from "@/game/age";
import { calculateStats } from "@/game/attributes/calculateAttributes";
import { analyzeLanguages } from "@/game/languages";
import type { ClassName, DeveloperProfile } from "@/game/types";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import {
  ENGINE_VERSION,
  createRPGCharacterV2,
  diagnoseEvolutionRules,
  normalizeRepositoryEvidence,
  type EvolutionId,
  type FrameworkAffinity,
  type PracticeArchetype,
  type RPGCharacterV2,
  type TechnologyEvidenceProfile,
  type ToolAffinity,
} from "@/game-v2";

type Dataset = "calibration" | "holdout" | "independent";
type BlockerCategory = "CLASS" | "SUBCLASS" | "SCORE" | "MATURITY" | "CONFIDENCE" | "COVERAGE" | "ATTRIBUTE" | "SKILL" | "JOURNEY" | "COMPOSITE_GATE" | "OTHER";

interface StoredInput {
  profile?: { username: string; cohort: Dataset };
  matrixProfile?: { username: string };
  rawProfile: unknown;
  evidence: TechnologyEvidenceProfile;
}

interface Context {
  profile: DeveloperProfile;
  character: RPGCharacterV2;
  className: ClassName;
  schools: FrameworkAffinity[];
  artifacts: ToolAffinity[];
}

interface GateResult {
  id: string;
  category: BlockerCategory;
  passed: boolean;
  essential: boolean;
  observed: string | number | boolean | null;
  required: string;
}

interface EvolutionDefinition {
  id: EvolutionId;
  name: { pt: string; en: string };
  rarity: "legendary" | "mythic";
  classes: ClassName[] | null;
  subclasses: PracticeArchetype[];
  minScore: number;
  minConfidence: "medium" | "high";
  identity: string;
  removalLoss: string;
  gates: (context: Context) => GateResult[];
}

const root = path.resolve("artifacts/game-v2-evolution");
const benchmarkRoot = path.resolve("artifacts/game-v2-benchmark");
const generalizationRoot = path.resolve("artifacts/game-v2-generalization");
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

function stats(profile: DeveloperProfile) {
  return calculateStats(profile, analyzeLanguages(profile.languages), calculateAccountAge(profile.accountCreatedAt, profile.referenceDate));
}

function ageYears(profile: DeveloperProfile): number {
  return calculateAccountAge(profile.accountCreatedAt, profile.referenceDate).years;
}

function schoolRepos(items: FrameworkAffinity[], families: string[]): number {
  return new Set(items.filter((item) => families.includes(item.family)).flatMap((item) => item.evidence.map((evidence) => evidence.repoId))).size;
}

function artifactRepos(items: ToolAffinity[], family: string): number {
  return new Set(items.filter((item) => item.family === family).flatMap((item) => item.evidence.map((evidence) => evidence.repoId))).size;
}

function gate(id: string, category: BlockerCategory, passed: boolean, observed: GateResult["observed"], required: string, essential = true): GateResult {
  return { id, category, passed, observed, required, essential };
}

const EVOLUTIONS: readonly EvolutionDefinition[] = [
  {
    id: "evo-archmage", name: { pt: "Arquimago", en: "Archmage" }, rarity: "mythic", classes: ["Mago"], subclasses: ["architect", "illusionist"], minScore: 75, minConfidence: "high",
    identity: "Domínio recorrente do ecossistema arcano web, sustentado por estrutura ou experiência visual.",
    removalLoss: "A jornada de um Mago cuja afinidade dominante se converteu em domínio recorrente de múltiplas Escolas.",
    gates: ({ profile, schools }) => {
      const affinity = (analyzeLanguages(profile.languages).languages[0]?.share ?? 0) * 100;
      const strongSchools = schools.filter((item) => (item.score ?? 0) >= 60).length;
      const experience = stats(profile).experience;
      return [gate("base-affinity", "SKILL", affinity >= 70, round(affinity), ">=70%"), gate("strong-schools", "COMPOSITE_GATE", strongSchools >= 2, strongSchools, ">=2 schools score>=60"), gate("experience", "MATURITY", experience >= 65, experience, ">=65")];
    },
  },
  {
    id: "evo-celestial-guardian", name: { pt: "Guardião Celestial", en: "Celestial Guardian" }, rarity: "mythic", classes: null, subclasses: ["guardian"], minScore: 78, minConfidence: "high",
    identity: "Proteção técnica recorrente combinada com colaboração observável e consistência.",
    removalLoss: "A jornada de proteção que une testes recorrentes e volume confirmado de reviews.",
    gates: ({ profile, artifacts }) => {
      const testingRepos = artifactRepos(artifacts, "testing");
      const consistency = stats(profile).consistency;
      return [gate("reviews-full", "COVERAGE", profile.reviews.coverage === "full", profile.reviews.coverage, "full"), gate("reviews", "JOURNEY", profile.reviews.value >= 200, profile.reviews.value, ">=200"), gate("testing-repos", "SKILL", testingRepos >= 5, testingRepos, ">=5"), gate("consistency", "ATTRIBUTE", consistency >= 70, consistency, ">=70")];
    },
  },
  {
    id: "evo-rune-master", name: { pt: "Mestre das Runas", en: "Rune Master" }, rarity: "legendary", classes: ["Guerreiro", "Paladino"], subclasses: ["artificer"], minScore: 75, minConfidence: "high",
    identity: "Tooling recorrente próximo a linguagens de sistemas e ecossistemas estruturados.",
    removalLoss: "A jornada em que a oficina de build se ancora em trabalho próprio de sistemas.",
    gates: ({ artifacts, profile }) => {
      const buildArtifacts = artifacts.filter((item) => ["build", "toolchain", "desktop"].includes(item.family) && item.evidenceRepoCount > 0).length;
      const systemsRepos = Math.max(0, ...profile.languages.filter((item) => ["Rust", "C", "C++", "Java", "C#"].includes(item.name)).map((item) => item.repoCount));
      return [gate("build-artifacts", "COMPOSITE_GATE", buildArtifacts >= 3, buildArtifacts, ">=3 build/toolchain/desktop artifacts"), gate("systems-repos", "SKILL", systemsRepos >= 2, systemsRepos, ">=2 repositories")];
    },
  },
  {
    id: "evo-arcane-weaver", name: { pt: "Tecelão Arcano", en: "Arcane Weaver" }, rarity: "legendary", classes: ["Bardo", "Tecelão", "Mago"], subclasses: ["illusionist"], minScore: 75, minConfidence: "high",
    identity: "Prática visual recorrente, forte e versátil, além de uma única aplicação ou starter.",
    removalLoss: "A jornada de interface recorrente que combina Escola visual forte e amplitude de afinidades.",
    gates: ({ profile, schools }) => {
      const uiRepos = schoolRepos(schools, ["ui-web", "mobile"]);
      const strongUi = schools.some((item) => ["ui-web", "mobile"].includes(item.family) && (item.score ?? 0) >= 60);
      const versatility = stats(profile).versatility;
      return [gate("ui-repos", "JOURNEY", uiRepos >= 5, uiRepos, ">=5"), gate("strong-ui-school", "SKILL", strongUi, strongUi, "school score>=60"), gate("versatility", "ATTRIBUTE", versatility >= 60, versatility, ">=60")];
    },
  },
  {
    id: "evo-ancestral-forger", name: { pt: "Forjador Ancestral", en: "Ancestral Forger" }, rarity: "legendary", classes: null, subclasses: ["artificer"], minScore: 72, minConfidence: "high",
    identity: "Criação de ferramentas sustentada por muitos anos e por uma oficina diversa.",
    removalLoss: "A jornada de Artífice cuja oficina e atividade permaneceram através de várias eras.",
    gates: ({ profile, artifacts }) => {
      const activeYears = profile.activity.yearly?.years.filter((year) => year.contributions > 0).length ?? 0;
      const artifactCount = artifacts.filter((item) => item.evidenceRepoCount > 0).length;
      return [gate("account-age", "MATURITY", ageYears(profile) >= 8, ageYears(profile), ">=8 years"), gate("yearly-full", "COVERAGE", profile.activity.yearly?.coverage === "full", profile.activity.yearly?.coverage ?? "unavailable", "full"), gate("active-years", "JOURNEY", activeYears >= 5, activeYears, ">=5"), gate("artifact-diversity", "COMPOSITE_GATE", artifactCount >= 4, artifactCount, ">=4 artifacts")];
    },
  },
  {
    id: "evo-high-chronomancer", name: { pt: "Alto Cronomante", en: "High Chronomancer" }, rarity: "mythic", classes: ["Ladino", "Patrulheiro"], subclasses: ["chronomancer"], minScore: 78, minConfidence: "high",
    identity: "Automação recorrente em que pipeline e entrega/infra convergem com consistência.",
    removalLoss: "A jornada operacional que une CI recorrente e containers ou infraestrutura recorrentes.",
    gates: ({ artifacts, profile }) => {
      const ciRepos = artifacts.find((item) => item.id === "github-actions")?.evidenceRepoCount ?? 0;
      const infraRepos = Math.max(0, ...artifacts.filter((item) => ["docker", "terraform"].includes(item.id)).map((item) => item.evidenceRepoCount));
      const consistency = stats(profile).consistency;
      return [gate("ci-repos", "SKILL", ciRepos >= 2, ciRepos, ">=2"), gate("container-infra-repos", "SKILL", infraRepos >= 2, infraRepos, ">=2"), gate("pipeline-infra-composite", "COMPOSITE_GATE", ciRepos >= 2 && infraRepos >= 2, `${ciRepos}/${infraRepos}`, ">=2 CI and >=2 container/infra"), gate("consistency", "ATTRIBUTE", consistency >= 70, consistency, ">=70")];
    },
  },
  {
    id: "evo-celestial-architect", name: { pt: "Arquiteto Celestial", en: "Celestial Architect" }, rarity: "mythic", classes: null, subclasses: ["architect"], minScore: 80, minConfidence: "high",
    identity: "Arquitetura madura e recorrente dos dois lados do portal, com diversidade estrutural.",
    removalLoss: "A jornada estrutural que sustenta frontend e backend fortes em vários repositórios.",
    gates: ({ profile, schools }) => {
      const frontendStrong = schools.some((item) => ["ui-web", "meta-web"].includes(item.family) && (item.score ?? 0) >= 60);
      const backendStrong = schools.some((item) => item.family === "backend" && (item.score ?? 0) >= 60);
      const frontendRepos = schoolRepos(schools, ["ui-web", "meta-web"]);
      const backendRepos = schoolRepos(schools, ["backend"]);
      const totalRepos = new Set(schools.flatMap((item) => item.evidence.map((evidence) => evidence.repoId))).size;
      const experience = stats(profile).experience;
      return [gate("frontend-strong", "SKILL", frontendStrong, frontendStrong, "frontend school score>=60"), gate("backend-strong", "SKILL", backendStrong, backendStrong, "backend school score>=60"), gate("frontend-backend", "COMPOSITE_GATE", frontendStrong && backendStrong && frontendRepos >= 2 && backendRepos >= 2, `${frontendRepos}/${backendRepos}`, "both strong and >=2 repos each"), gate("structural-repos", "JOURNEY", totalRepos >= 6, totalRepos, ">=6"), gate("experience", "MATURITY", experience >= 75, experience, ">=75")];
    },
  },
] as const;

function evaluate(definition: EvolutionDefinition, context: Context) {
  const subclass = context.character.subclass;
  const classEligible = definition.classes === null || definition.classes.includes(context.className);
  const subclassEligible = subclass.value !== null && definition.subclasses.includes(subclass.value);
  const scoreEligible = subclassEligible && (subclass.score ?? 0) >= definition.minScore;
  const confidenceEligible = subclass.confidence === "high" || (definition.minConfidence === "medium" && subclass.confidence === "medium");
  const coverageEligible = context.profile.languagesCoverage === "full" && subclass.coverage === "full";
  const specificGates = definition.gates(context);
  const gates: GateResult[] = [
    gate("class", "CLASS", classEligible, context.className, definition.classes?.join("|") ?? "any"),
    gate("subclass", "SUBCLASS", subclassEligible, subclass.value, definition.subclasses.join("|")),
    gate("score", "SCORE", scoreEligible, subclassEligible ? round(subclass.score ?? 0) : null, `>=${definition.minScore}`),
    gate("confidence", "CONFIDENCE", confidenceEligible, subclass.confidence, definition.minConfidence),
    gate("coverage", "COVERAGE", coverageEligible, `${context.profile.languagesCoverage}/${subclass.coverage}`, "full/full"),
    ...specificGates,
  ];
  const unlock = gates.every((item) => item.passed);
  return { gates, unlock, passed: gates.filter((item) => item.passed).length, total: gates.length };
}

function leadingCompatibleScore(definition: EvolutionDefinition, character: RPGCharacterV2): number {
  return Math.max(0, ...character.archetypes.filter((item) => definition.subclasses.includes(item.archetype)).map((item) => item.score ?? 0));
}

function candidateRank(definition: EvolutionDefinition, context: Context, evaluation: ReturnType<typeof evaluate>): number {
  const classFit = definition.classes === null || definition.classes.includes(context.className) ? 1000 : 0;
  const subclassFit = context.character.subclass.value !== null && definition.subclasses.includes(context.character.subclass.value) ? 2000 : 0;
  return subclassFit + classFit + evaluation.passed * 100 + leadingCompatibleScore(definition, context.character);
}

async function loadJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function main(): Promise<void> {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/inputs-v21", "artifacts/game-v2-generalization/inputs-v24"]);
  const finalMode = process.argv.includes("--final");
  const definitions = EVOLUTIONS.map((definition) => finalMode && definition.id === "evo-high-chronomancer" ? { ...definition, minConfidence: "medium" as const } : definition);
  const sources: Array<{ dataset: Dataset; file: string }> = [];
  for (const file of (await readdir(path.join(benchmarkRoot, "inputs-v21"))).filter((item) => item.endsWith(".json")).sort()) {
    const stored = await loadJson<StoredInput>(path.join(benchmarkRoot, "inputs-v21", file));
    if (stored.profile?.cohort === "calibration" || stored.profile?.cohort === "holdout") sources.push({ dataset: stored.profile.cohort, file: path.join(benchmarkRoot, "inputs-v21", file) });
  }
  for (const file of (await readdir(path.join(generalizationRoot, "inputs-v24"))).filter((item) => item.endsWith(".json")).sort()) sources.push({ dataset: "independent", file: path.join(generalizationRoot, "inputs-v24", file) });
  if (sources.length !== 70) throw new Error(`Expected 70 frozen snapshots, found ${sources.length}.`);

  const profiles: Array<{ dataset: Dataset; username: string; context: Context; diagnostics: Record<EvolutionId, ReturnType<typeof evaluate>>; deterministic: boolean }> = [];
  for (const source of sources) {
    const stored = await loadJson<StoredInput>(source.file);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const character = createRPGCharacterV2({ profile, evidence });
    const replay = createRPGCharacterV2({ profile, evidence });
    const context: Context = { profile, character, className: character.class.value, schools: character.explanation.schools, artifacts: character.explanation.artifacts };
    const diagnostics = Object.fromEntries(definitions.map((definition) => [definition.id, evaluate(definition, context)])) as Record<EvolutionId, ReturnType<typeof evaluate>>;
    const runtime = diagnoseEvolutionRules({ profile, className: context.className, subclass: character.subclass, schools: context.schools, artifacts: context.artifacts });
    for (const item of runtime) if (diagnostics[item.id].unlock !== item.unlock) throw new Error(`Diagnostic drift for ${profile.username}:${item.id}.`);
    profiles.push({ dataset: source.dataset, username: profile.username, context, diagnostics, deterministic: JSON.stringify(character) === JSON.stringify(replay) });
  }

  const mature = profiles.filter(({ context }) => ageYears(context.profile) >= 3 && context.profile.ownRepositories.value >= 5);
  const subclassEligibleMature = mature.filter(({ context }) => context.character.subclass.value !== null);
  const unlocked = profiles.filter(({ context }) => context.character.evolution.value !== null);
  const funnels = definitions.map((definition) => {
    const steps = { total: profiles.length, classEligible: 0, subclassEligible: 0, maturityEligible: 0, evidenceEligible: 0, confidenceEligible: 0, coverageEligible: 0, scoreEligible: 0, unlocked: 0 };
    const rawGatePassCounts = { classEligible: 0, subclassEligible: 0, maturityEligible: 0, evidenceEligible: 0, confidenceEligible: 0, coverageEligible: 0, scoreEligible: 0 };
    const blockerCounts = Object.fromEntries((["CLASS", "SUBCLASS", "SCORE", "MATURITY", "CONFIDENCE", "COVERAGE", "ATTRIBUTE", "SKILL", "JOURNEY", "COMPOSITE_GATE", "OTHER"] as BlockerCategory[]).map((key) => [key, 0])) as Record<BlockerCategory, number>;
    for (const profile of profiles) {
      const evaluation = profile.diagnostics[definition.id];
      const byId = new Map(evaluation.gates.map((item) => [item.id, item]));
      const maturityGates = evaluation.gates.filter((item) => item.category === "MATURITY");
      const evidenceGates = evaluation.gates.filter((item) => ["ATTRIBUTE", "SKILL", "JOURNEY", "COMPOSITE_GATE"].includes(item.category));
      const coverageGates = evaluation.gates.filter((item) => item.category === "COVERAGE");
      const passed = {
        classEligible: byId.get("class")?.passed === true,
        subclassEligible: byId.get("subclass")?.passed === true,
        maturityEligible: maturityGates.every((item) => item.passed),
        evidenceEligible: evidenceGates.every((item) => item.passed),
        confidenceEligible: byId.get("confidence")?.passed === true,
        coverageEligible: coverageGates.every((item) => item.passed),
        scoreEligible: byId.get("score")?.passed === true,
      };
      for (const key of Object.keys(rawGatePassCounts) as Array<keyof typeof rawGatePassCounts>) if (passed[key]) rawGatePassCounts[key]++;
      let cumulative = true;
      for (const key of ["classEligible", "subclassEligible", "maturityEligible", "evidenceEligible", "confidenceEligible", "coverageEligible", "scoreEligible"] as const) {
        cumulative = cumulative && passed[key];
        if (cumulative) steps[key]++;
      }
      if (evaluation.unlock) steps.unlocked++;
      const classApplies = byId.get("class")?.passed === true;
      const subclassApplies = byId.get("subclass")?.passed === true;
      for (const failed of evaluation.gates.filter((item) => !item.passed)) {
        if (failed.category === "CLASS" || (failed.category === "SUBCLASS" && classApplies) || (classApplies && subclassApplies)) blockerCounts[failed.category]++;
      }
    }
    return { evolution: definition.id, steps, rawGatePassCounts, blockerCounts };
  });

  const candidates = Object.fromEntries(definitions.map((definition) => {
    const ranked = profiles.map((profile) => ({ profile, evaluation: profile.diagnostics[definition.id] }))
      .sort((left, right) => candidateRank(definition, right.profile.context, right.evaluation) - candidateRank(definition, left.profile.context, left.evaluation) || left.profile.username.localeCompare(right.profile.username, "en"))
      .slice(0, 3)
      .map(({ profile, evaluation }) => ({
        username: profile.username, dataset: profile.dataset, class: profile.context.className, subclass: profile.context.character.subclass.value,
        leadingCompatibleScore: round(leadingCompatibleScore(definition, profile.context.character)), passedGates: evaluation.gates.filter((item) => item.passed).map((item) => item.id),
        failedGates: evaluation.gates.filter((item) => !item.passed).map((item) => ({ id: item.id, category: item.category, observed: item.observed, required: item.required })),
        conceptualDistance: evaluation.gates.filter((item) => !item.passed).length,
      }));
    return [definition.id, ranked];
  }));

  const catalog = definitions.map((definition) => ({ id: definition.id, name: definition.name, rarity: definition.rarity, classes: definition.classes ?? ["any"], subclasses: definition.subclasses, minSubclassScore: definition.minScore, minConfidence: definition.minConfidence, identity: definition.identity, removalLoss: definition.removalLoss }));
  const generatedAt = new Date().toISOString();
  const baseline = {
    generatedAt, stage: finalMode ? "3G-E1-FINAL" : "3G-E0", engineVersion: ENGINE_VERSION, snapshots: profiles.length,
    denominators: { totalProfiles: profiles.length, matureProfiles: mature.length, subclassEligibleMatureProfiles: subclassEligibleMature.length },
    evolutionCount: unlocked.length, evolutionRateAllPercent: round(100 * unlocked.length / profiles.length, 1), evolutionRateMaturePercent: round(100 * unlocked.length / mature.length, 1), evolutionRateSubclassEligibleMaturePercent: round(100 * unlocked.length / subclassEligibleMature.length, 1),
    distribution: Object.fromEntries(definitions.map((definition) => [definition.id, unlocked.filter(({ context }) => context.character.evolution.value === definition.id).length])),
    profiles: profiles.map(({ dataset, username, context, diagnostics, deterministic }) => ({ dataset, username, class: context.className, subclass: context.character.subclass.value, subclassScore: round(context.character.subclass.score ?? 0), confidence: context.character.subclass.confidence, coverage: context.character.subclass.coverage, evolution: context.character.evolution.value, evolutionReasonCode: context.character.evolution.reasonCode, mature: ageYears(context.profile) >= 3 && context.profile.ownRepositories.value >= 5, deterministic, diagnostics })),
  };
  const developit = baseline.profiles.find((item) => item.username.toLowerCase() === "developit");
  const analysis = { generatedAt, stage: finalMode ? "3G-E1-FINAL" : "3G-E0", catalog, baseline: { ...baseline, profiles: undefined }, developit, funnels, candidates, deterministic: { passed: profiles.filter((item) => item.deterministic).length, total: profiles.length }, requestsAdded: 0 };

  await mkdir(root, { recursive: true });
  if (finalMode) {
    await writeFile(path.join(root, "e1-final.json"), `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
    await writeFile(path.join(root, "evolution-holdout.json"), `${JSON.stringify({ generatedAt, stage: "3G-E1-LOCKED-HOLDOUT", tuningAfterReplayAllowed: false, profiles: baseline.profiles.filter((item) => item.dataset === "holdout"), summary: { profiles: 10, evolutions: baseline.profiles.filter((item) => item.dataset === "holdout" && item.evolution !== null).length, deterministic: baseline.profiles.filter((item) => item.dataset === "holdout" && item.deterministic).length } }, null, 2)}\n`, "utf8");
  } else {
    await writeFile(path.join(root, "e0-baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    await writeFile(path.join(root, "e0-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
    await writeFile(path.join(root, "evolution-funnels.json"), `${JSON.stringify({ generatedAt, stage: "3G-E0", funnels }, null, 2)}\n`, "utf8");
    await writeFile(path.join(root, "evolution-near-misses.json"), `${JSON.stringify({ generatedAt, stage: "3G-E0", candidates }, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ profiles: profiles.length, mature: mature.length, subclassEligibleMature: subclassEligibleMature.length, evolutions: unlocked.length, distribution: baseline.distribution, deterministic: analysis.deterministic, requestsAdded: 0 }, null, 2));
}

void main();
