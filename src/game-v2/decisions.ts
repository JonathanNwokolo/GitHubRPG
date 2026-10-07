import { calculateAccountAge } from "@/game/age";
import { analyzeLanguages } from "@/game/languages";
import { classForLanguage } from "@/game/classes/classMatrix";
import type { ClassName, DeveloperProfile } from "@/game/types";
import { ARCHETYPE_NAMES, ARCHETYPE_ORDER, RULES_VERSION, V2_BALANCE } from "./constants";
import type { ArchetypeAffinity, ClassDecision, ConfidenceLevel, EvolutionDecision, EvolutionId, FrameworkAffinity, LocalizedText, PracticeArchetype, SubclassDecision, ToolAffinity, UncertaintyBudget } from "./types";

const EXPANDED_LANGUAGE_CLASS: Readonly<Record<string, ClassName>> = {
  coffeescript: "Mago", r: "Alquimista", "jupyter notebook": "Alquimista", assembly: "Guerreiro", zig: "Guerreiro", elixir: "Patrulheiro", erlang: "Patrulheiro", scala: "Paladino", scss: "Bardo", less: "Bardo", batchfile: "Ladino", fish: "Ladino", hack: "Escriba", "objective-c": "Sentinela",
};

function reason(pt: string, en: string): LocalizedText { return { pt, en }; }
function confidenceForLanguages(profile: DeveloperProfile): ConfidenceLevel { return profile.languagesCoverage === "unavailable" ? "unavailable" : profile.languages.length >= 3 && profile.languagesCoverage === "full" ? "high" : profile.languages.length > 0 ? "medium" : "low"; }

export function decideClass(profile: DeveloperProfile): ClassDecision {
  const analysis = analyzeLanguages(profile.languages);
  const dominant = analysis.languages[0];
  let value: ClassName = "Aventureiro";
  let score: number | null = null;
  if (dominant) {
    score = dominant.share * 100;
    const mapped = classForLanguage(dominant.name);
    value = mapped === "Aventureiro" ? EXPANDED_LANGUAGE_CLASS[dominant.name.trim().toLowerCase()] ?? "Aventureiro" : mapped;
    if (dominant.share < .20) value = "Aventureiro";
  }
  const coverage = profile.languagesCoverage;
  const status = dominant ? "strong" : coverage === "unavailable" ? "unavailable" : "insufficient";
  return {
    value, status, score, confidence: confidenceForLanguages(profile), coverage, evidence: [], alternatives: analysis.languages.slice(1, 4).map((language) => ({ value: classForLanguage(language.name), score: language.share * 100, reasonCode: "secondary_affinity" })),
    rulesApplied: ["class_from_dominant_language_bytes", "unknown_language_falls_back_to_adventurer", "minimum_share_20"], reasonCode: dominant ? value === "Aventureiro" ? "language_unmapped_or_weak" : "dominant_language_mapping" : "languages_missing",
    reason: dominant ? reason(`${dominant.name} representa ${Math.floor(dominant.share * 1000) / 10}% dos bytes observados e aponta para ${value}.`, `${dominant.name} accounts for ${Math.floor(dominant.share * 1000) / 10}% of observed bytes and maps to ${value}.`) : reason("Nenhuma afinidade de linguagem utilizável foi observada.", "No usable language affinity was observed."), rulesVersion: RULES_VERSION,
  };
}

function archetypeSort(a: ArchetypeAffinity, b: ArchetypeAffinity): number {
  return (b.score ?? -1) - (a.score ?? -1) || b.primaryEvidenceRepoCount - a.primaryEvidenceRepoCount || ((b.confidence === "high" ? 2 : b.confidence === "medium" ? 1 : 0) - (a.confidence === "high" ? 2 : a.confidence === "medium" ? 1 : 0)) || (b.scoreWithoutAttributes ?? -1) - (a.scoreWithoutAttributes ?? -1) || ARCHETYPE_ORDER.indexOf(a.archetype) - ARCHETYPE_ORDER.indexOf(b.archetype);
}

const NO_UNCERTAINTY: UncertaintyBudget = { totalScore: 0, schoolScore: 0, artifactScore: 0, reviewScore: 0, uncertainRepositories: 0, omittedManifests: 0 };

export function decideSubclass(profile: DeveloperProfile, affinities: ArchetypeAffinity[]): SubclassDecision {
  const sorted = [...affinities].sort(archetypeSort);
  const top = sorted[0]; const second = sorted[1];
  const alternatives = sorted.slice(1).map((item) => ({ value: item.archetype, score: item.score, reasonCode: "lower_archetype_score" }));
  if (!top || top.score === null) return { value: null, status: "unavailable", score: null, observedScore: null, lowerBound: null, upperBound: null, runnerUpUpperBound: null, guaranteedMargin: null, safeWinner: false, uncertainty: NO_UNCERTAINTY, boundReason: "evidence_unavailable", confidence: "unavailable", coverage: "unavailable", evidence: [], alternatives, rulesApplied: ["required_evidence_available"], reasonCode: "evidence_unavailable", reason: reason("Evidência de Escolas e Artefatos indisponível.", "School and Artifact evidence is unavailable."), rulesVersion: RULES_VERSION };
  const lowerBound = top.lowerBound ?? top.score;
  const upperBound = top.upperBound ?? top.score;
  const runnerUpUpperBound = Math.max(...sorted.slice(1).map((item) => item.upperBound ?? item.score ?? 0), 0);
  const guaranteedMargin = lowerBound - runnerUpUpperBound;
  const safeWinner = guaranteedMargin >= V2_BALANCE.subclassMargin;
  const boundFields = { observedScore: top.score, lowerBound, upperBound, runnerUpUpperBound, guaranteedMargin, safeWinner, uncertainty: top.uncertainty, boundReason: safeWinner ? top.coverage === "partial" ? "safe_under_partial_coverage" : "winner_preserved_at_required_margin" : top.coverage === "partial" ? "partial_can_change_winner" : "observed_margin_below_requirement" };
  const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
  if (age.years * 365.2425 < V2_BALANCE.immatureDays || profile.ownRepositories.value < V2_BALANCE.immatureRepos) return { value: null, status: "insufficient", score: top.score, ...boundFields, confidence: top.confidence, coverage: top.coverage, evidence: top.evidence, alternatives, rulesApplied: ["profile_age_90_days", "at_least_2_owned_repositories"], reasonCode: "profile_immature", reason: reason("Perfil ainda pequeno para uma especialização de prática.", "Profile is still too small for a practice specialization."), rulesVersion: RULES_VERSION };
  const margin = top.score - (second?.score ?? 0);
  const gates = top.score >= V2_BALANCE.subclassStrong && safeWinner && top.primaryEvidenceRepoCount >= 2 && (top.confidence === "medium" || top.confidence === "high");
  if (!gates) {
    const reasonCode = top.score < V2_BALANCE.subclassStrong ? "score_below_threshold" : margin < V2_BALANCE.subclassMargin ? "margin_insufficient" : !safeWinner ? "partial_can_change_winner" : top.confidence === "low" ? "confidence_insufficient" : "evidence_repo_count_insufficient";
    const partialCopy = reasonCode === "partial_can_change_winner"
      ? reason("A cobertura parcial ainda pode alterar a especialização predominante; nenhuma subclasse foi concedida.", "Partial coverage can still change the leading specialization; no subclass was granted.")
      : reason(`A especialização ${ARCHETYPE_NAMES[top.archetype].pt} não passou todos os gates (${reasonCode}).`, `${ARCHETYPE_NAMES[top.archetype].en} did not pass every gate (${reasonCode}).`);
    return { value: null, status: top.score >= V2_BALANCE.subclassPossible ? "possible" : "insufficient", score: top.score, ...boundFields, confidence: top.confidence, coverage: top.coverage, evidence: top.evidence, alternatives, rulesApplied: ["score_55", "guaranteed_margin_5", "confidence_medium", "two_evidence_repositories", "deterministic_evidence_bounds"], reasonCode, reason: partialCopy, rulesVersion: RULES_VERSION };
  }
  const partial = top.coverage === "partial";
  return { value: top.archetype, status: "strong", score: top.score, ...boundFields, confidence: top.confidence, coverage: top.coverage, evidence: top.evidence, alternatives, rulesApplied: ["score_55", "guaranteed_margin_5", "confidence_medium", "two_evidence_repositories", "deterministic_evidence_bounds"], reasonCode: partial ? "safe_under_partial_coverage" : "strong_archetype_evidence", reason: partial ? reason("Mesmo com cobertura parcial, a evidência ausente não é suficiente para alterar a especialização predominante.", "Even with partial coverage, the missing evidence is not sufficient to change the leading specialization.") : reason(`${ARCHETYPE_NAMES[top.archetype].pt} venceu com score ${Math.round(top.score)} e margem garantida ${Math.round(guaranteedMargin)}.`, `${ARCHETYPE_NAMES[top.archetype].en} won with score ${Math.round(top.score)} and a guaranteed margin of ${Math.round(guaranteedMargin)}.`), rulesVersion: RULES_VERSION };
}

interface EvolutionSpecificDiagnostic { maturityEligible: boolean; attributeEligible: boolean; skillEligible: boolean; journeyEligible: boolean; compositeEligible: boolean; extraCoverageEligible: boolean }
interface EvolutionRule {
  id: EvolutionId;
  name: LocalizedText;
  rarity: "legendary" | "mythic";
  subclasses: PracticeArchetype[];
  minScore: number;
  minConfidence: "medium" | "high";
  classes?: ClassName[];
  diagnose: (context: EvolutionContext) => EvolutionSpecificDiagnostic;
}
export interface EvolutionContext { profile: DeveloperProfile; className: ClassName; subclass: SubclassDecision; schools: FrameworkAffinity[]; artifacts: ToolAffinity[] }
export interface EvolutionRuleDiagnostic extends EvolutionSpecificDiagnostic { id: EvolutionId; classEligible: boolean; subclassEligible: boolean; coverageEligible: boolean; confidenceEligible: boolean; scoreEligible: boolean; otherGatesEligible: boolean; unlock: boolean }

const passedSpecific = (overrides: Partial<EvolutionSpecificDiagnostic>): EvolutionSpecificDiagnostic => ({ maturityEligible: true, attributeEligible: true, skillEligible: true, journeyEligible: true, compositeEligible: true, extraCoverageEligible: true, ...overrides });

const EVOLUTIONS: readonly EvolutionRule[] = [
  { id: "evo-archmage", name: reason("Arquimago", "Archmage"), rarity: "mythic", subclasses: ["architect", "illusionist"], minScore: 75, minConfidence: "high", classes: ["Mago"], diagnose: ({ profile, schools }) => passedSpecific({ skillEligible: (analyzeLanguages(profile.languages).languages[0]?.share ?? 0) >= .70, compositeEligible: schools.filter((item) => (item.score ?? 0) >= 60).length >= 2, maturityEligible: calculateStatsExperience(profile) >= 65 }) },
  { id: "evo-celestial-guardian", name: reason("Guardião Celestial", "Celestial Guardian"), rarity: "mythic", subclasses: ["guardian"], minScore: 78, minConfidence: "high", diagnose: ({ profile, artifacts }) => passedSpecific({ extraCoverageEligible: profile.reviews.coverage === "full", journeyEligible: profile.reviews.value >= 200, skillEligible: artifactRepos(artifacts, "testing") >= 5, attributeEligible: calculateConsistencyValue(profile) >= 70 }) },
  { id: "evo-rune-master", name: reason("Mestre das Runas", "Rune Master"), rarity: "legendary", subclasses: ["artificer"], minScore: 75, minConfidence: "high", classes: ["Guerreiro", "Paladino"], diagnose: ({ artifacts, profile }) => passedSpecific({ compositeEligible: artifacts.filter((item) => ["build", "toolchain", "desktop"].includes(item.family) && item.evidenceRepoCount > 0).length >= 3, skillEligible: profile.languages.some((item) => ["Rust", "C", "C++", "Java", "C#"].includes(item.name) && item.repoCount >= 2) }) },
  { id: "evo-arcane-weaver", name: reason("Tecelão Arcano", "Arcane Weaver"), rarity: "legendary", subclasses: ["illusionist"], minScore: 75, minConfidence: "high", classes: ["Bardo", "Tecelão", "Mago"], diagnose: ({ profile, schools }) => passedSpecific({ journeyEligible: schoolRepos(schools, ["ui-web", "mobile"]) >= 5, skillEligible: schools.some((item) => ["ui-web", "mobile"].includes(item.family) && (item.score ?? 0) >= 60), attributeEligible: calculateVersatilityValue(profile) >= 60 }) },
  { id: "evo-ancestral-forger", name: reason("Forjador Ancestral", "Ancestral Forger"), rarity: "legendary", subclasses: ["artificer"], minScore: 72, minConfidence: "high", diagnose: ({ profile, artifacts }) => passedSpecific({ maturityEligible: calculateAccountAge(profile.accountCreatedAt, profile.referenceDate).years >= 8, extraCoverageEligible: profile.activity.yearly?.coverage === "full", journeyEligible: (profile.activity.yearly?.years.filter((year) => year.contributions > 0).length ?? 0) >= 5, compositeEligible: artifacts.filter((item) => item.evidenceRepoCount > 0).length >= 4 }) },
  { id: "evo-high-chronomancer", name: reason("Alto Cronomante", "High Chronomancer"), rarity: "mythic", subclasses: ["chronomancer"], minScore: 78, minConfidence: "medium", classes: ["Ladino", "Patrulheiro"], diagnose: ({ artifacts, profile }) => { const ci = artifacts.some((item) => item.id === "github-actions" && item.evidenceRepoCount >= 2); const infra = artifacts.some((item) => ["docker", "terraform"].includes(item.id) && item.evidenceRepoCount >= 2); return passedSpecific({ skillEligible: ci && infra, attributeEligible: calculateConsistencyValue(profile) >= 70 }); } },
  { id: "evo-celestial-architect", name: reason("Arquiteto Celestial", "Celestial Architect"), rarity: "mythic", subclasses: ["architect"], minScore: 80, minConfidence: "high", diagnose: ({ profile, schools }) => { const frontend = schools.some((item) => ["ui-web", "meta-web"].includes(item.family) && (item.score ?? 0) >= 60); const backend = schools.some((item) => item.family === "backend" && (item.score ?? 0) >= 60); const frontendRepos = schoolRepos(schools, ["ui-web", "meta-web"]); const backendRepos = schoolRepos(schools, ["backend"]); return passedSpecific({ skillEligible: frontend && backend, compositeEligible: frontendRepos >= 2 && backendRepos >= 2, journeyEligible: new Set(schools.flatMap((item) => item.evidence.map((e) => e.repoId))).size >= 6, maturityEligible: calculateStatsExperience(profile) >= 75 }); } },
];

export const EVOLUTION_CATALOG = EVOLUTIONS.map(({ diagnose: _diagnose, ...definition }) => definition);

function v1Stats(profile: DeveloperProfile) { const analysis = analyzeLanguages(profile.languages); const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate); return requireStats(profile, analysis, age); }
import { calculateStats as requireStats } from "@/game/attributes/calculateAttributes";
function calculateStatsExperience(profile: DeveloperProfile) { return v1Stats(profile).experience; }
function calculateConsistencyValue(profile: DeveloperProfile) { return v1Stats(profile).consistency; }
function calculateVersatilityValue(profile: DeveloperProfile) { return v1Stats(profile).versatility; }
function artifactRepos(items: ToolAffinity[], family: string) { return new Set(items.filter((item) => item.family === family).flatMap((item) => item.evidence.map((e) => e.repoId))).size; }
function schoolRepos(items: FrameworkAffinity[], families: string[]) { return new Set(items.filter((item) => families.includes(item.family)).flatMap((item) => item.evidence.map((e) => e.repoId))).size; }

export function diagnoseEvolutionRules(context: EvolutionContext): EvolutionRuleDiagnostic[] {
  return EVOLUTIONS.map((rule) => {
    const classEligible = !rule.classes || rule.classes.includes(context.className);
    const subclassEligible = context.subclass.value !== null && rule.subclasses.includes(context.subclass.value);
    const specific = rule.diagnose(context);
    const coverageEligible = context.profile.languagesCoverage === "full" && context.subclass.coverage === "full" && specific.extraCoverageEligible;
    const confidenceEligible = context.subclass.confidence === "high" || (rule.minConfidence === "medium" && context.subclass.confidence === "medium");
    const scoreEligible = (context.subclass.score ?? 0) >= rule.minScore;
    const otherGatesEligible = specific.maturityEligible && specific.attributeEligible && specific.skillEligible && specific.journeyEligible && specific.compositeEligible;
    return { id: rule.id, classEligible, subclassEligible, coverageEligible, confidenceEligible, scoreEligible, ...specific, otherGatesEligible, unlock: classEligible && subclassEligible && coverageEligible && confidenceEligible && context.subclass.status === "strong" && scoreEligible && otherGatesEligible };
  });
}

function evolutionBlockedReason(diagnostic: EvolutionRuleDiagnostic): { code: string; reason: LocalizedText } {
  if (!diagnostic.classEligible) return { code: "EVOLUTION_CLASS_MISMATCH", reason: reason("A classe atual não é compatível com esta evolução.", "The current class is not compatible with this evolution.") };
  if (!diagnostic.subclassEligible) return { code: "EVOLUTION_SUBCLASS_REQUIRED", reason: reason("A subclasse forte exigida por esta evolução ainda não foi concedida.", "The strong subclass required by this evolution has not been granted yet.") };
  if (!diagnostic.maturityEligible) return { code: "EVOLUTION_MATURITY_LOW", reason: reason("A jornada ainda não atingiu a maturidade exigida por esta evolução.", "The journey has not yet reached the maturity required by this evolution.") };
  if (!diagnostic.confidenceEligible) return { code: "EVOLUTION_CONFIDENCE_LOW", reason: reason("A evidência ainda não atingiu a confiança exigida por esta evolução.", "The evidence has not yet reached the confidence required by this evolution.") };
  if (!diagnostic.coverageEligible) return { code: "EVOLUTION_COVERAGE_INSUFFICIENT", reason: reason("A cobertura ainda não é suficiente para conceder esta evolução rara.", "Coverage is not yet sufficient to grant this rare evolution.") };
  if (!diagnostic.attributeEligible) return { code: "EVOLUTION_ATTRIBUTE_GATE", reason: reason("Um atributo essencial desta evolução ainda não atingiu o gate.", "An essential attribute for this evolution has not reached its gate yet.") };
  if (!diagnostic.scoreEligible || !diagnostic.skillEligible) return { code: "EVOLUTION_SKILL_GATE", reason: reason("A afinidade ou prática específica desta evolução ainda não atingiu o gate.", "The affinity or specific practice for this evolution has not reached its gate yet.") };
  return { code: "EVOLUTION_COMPOSITE_GATE", reason: reason("A combinação específica de evidências desta evolução ainda está incompleta.", "The specific evidence combination for this evolution is still incomplete.") };
}

export function decideEvolution(context: EvolutionContext): EvolutionDecision {
  const base = { alternatives: [] as Array<{ value: EvolutionId; score: number | null; reasonCode: string }>, rulesApplied: ["subclass_strong", "evolution_specific_confidence", "full_coverage", "class_compatibility", "compound_gates"], rulesVersion: RULES_VERSION };
  if (context.subclass.value === null) return { ...base, value: null, status: context.subclass.status === "unavailable" ? "unavailable" : "insufficient", score: null, confidence: context.subclass.confidence, coverage: context.subclass.coverage, evidence: [], reasonCode: "EVOLUTION_SUBCLASS_REQUIRED", reason: reason("Nenhuma evolução: uma subclasse forte é obrigatória.", "No evolution: a strong subclass is required.") };
  const candidates = EVOLUTIONS.filter((rule) => rule.subclasses.includes(context.subclass.value!));
  const diagnostics = diagnoseEvolutionRules(context);
  const unlocked = new Set(diagnostics.filter((item) => item.unlock).map((item) => item.id));
  const passed = candidates.filter((rule) => unlocked.has(rule.id)).sort((a, b) => b.minScore - a.minScore || a.id.localeCompare(b.id, "en"));
  const winner = passed[0];
  if (winner) return { ...base, value: winner.id, status: "strong", score: context.subclass.score, confidence: context.subclass.confidence, coverage: "full", evidence: context.subclass.evidence, alternatives: passed.slice(1).map((rule) => ({ value: rule.id, score: context.subclass.score, reasonCode: "lower_gate_specificity" })), rulesApplied: [...base.rulesApplied, "evolution_tiebreak_higher_minimum_score_then_id"], reasonCode: "EVOLUTION_GRANTED", reason: reason(`Todos os gates de ${winner.name.pt} foram atendidos.`, `All ${winner.name.en} gates were met.`) };
  const closest = candidates.map((rule) => ({ rule, diagnostic: diagnostics.find((item) => item.id === rule.id)! })).sort((left, right) => Number(right.diagnostic.classEligible) + Number(right.diagnostic.coverageEligible) + Number(right.diagnostic.confidenceEligible) + Number(right.diagnostic.scoreEligible) + Number(right.diagnostic.otherGatesEligible) - (Number(left.diagnostic.classEligible) + Number(left.diagnostic.coverageEligible) + Number(left.diagnostic.confidenceEligible) + Number(left.diagnostic.scoreEligible) + Number(left.diagnostic.otherGatesEligible)) || right.rule.minScore - left.rule.minScore || left.rule.id.localeCompare(right.rule.id, "en"))[0];
  const blocked = closest ? evolutionBlockedReason(closest.diagnostic) : { code: "EVOLUTION_SUBCLASS_REQUIRED", reason: reason("Nenhuma evolução é compatível com a subclasse atual.", "No evolution is compatible with the current subclass.") };
  return { ...base, value: null, status: "insufficient", score: context.subclass.score, confidence: context.subclass.confidence, coverage: context.subclass.coverage, evidence: context.subclass.evidence, reasonCode: blocked.code, reason: blocked.reason };
}
