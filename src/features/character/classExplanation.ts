import { LANGUAGE_RULES, classForLanguage } from "@/game/engine";
import type { LanguageAnalysis } from "@/game/languages";
import type { ClassName, DataCoverage, RPGArchetype } from "@/game/types";

/**
 * "Why this class?": the evidence behind the archetype, as data. Plain, serialisable and language-free
 * (the sentences live in the i18n dictionaries and are filled with the numbers below).
 *
 * It EXPLAINS the class the engine already decided and never decides one itself:
 * - the class and subclass come from `archetype` (the engine's own result);
 * - the language -> class mapping is the engine's `classForLanguage`, never a copy of it;
 * - the thresholds are the engine's `LANGUAGE_RULES`, so a rebalance shows up here without touching this file.
 * The trace in `checks` mirrors how determineArchetype reads the languages, and the tests pin it to the
 * engine's answer, so the two cannot drift silently.
 */

export type ClassExplanationStatus =
  /** The dominant language maps to a class. */
  | "language"
  /** There is a dominant language, but it maps to no class: the character is an Aventureiro. */
  | "unmappedLanguage"
  /** The own repositories hold no language bytes at all. */
  | "noLanguages"
  /** The languages could not be read: nothing is claimed about them. */
  | "unavailable";

/** Why the character has (or has not) a subclass. */
export type SubclassReason =
  | "assigned"
  /** A language that maps to another class exists, but it is below the subclass threshold. */
  | "belowThreshold"
  /** The other relevant languages point at the main class (TypeScript + JavaScript) or at no class. */
  | "noDistinctAffinity"
  /** There is no other relevant language. */
  | "noOtherLanguage"
  /** No dominant language, so there is nothing to compare. */
  | "notApplicable";

export type AffinityOutcome =
  /** It became the subclass. */
  | "subclass"
  /** It maps to the main class: it adds nothing new. */
  | "sameClass"
  /** It maps to no class. */
  | "noClass"
  /** It maps to a different class but holds too little of the relevant usage. */
  | "belowThreshold";

export interface AffinityCheck {
  language: string;
  className: ClassName;
  /** Share of every language byte analysed, 0-1. */
  share: number;
  /** Share among the relevant languages only (the figure the subclass rule reads), 0-1. */
  relevantShare: number;
  outcome: AffinityOutcome;
}

export interface ClassExplanation {
  status: ClassExplanationStatus;
  /** Coverage of the language data: "partial" means the percentages are approximate. */
  coverage: DataCoverage;
  className: ClassName;
  dominant: { language: string; share: number } | null;
  subclass: { className: ClassName; language: string; share: number; relevantShare: number } | null;
  subclassReason: SubclassReason;
  /** The other relevant languages, in the order the subclass rule reads them (largest first). */
  checks: AffinityCheck[];
  /** The engine's thresholds, 0-1. */
  rules: { relevantShare: number; subclassShare: number };
}

const RULES = { relevantShare: LANGUAGE_RULES.relevantShare, subclassShare: LANGUAGE_RULES.subclassShare } as const;

function emptyExplanation(
  status: "noLanguages" | "unavailable",
  archetype: RPGArchetype,
  coverage: DataCoverage
): ClassExplanation {
  return {
    status,
    coverage,
    className: archetype.className,
    dominant: null,
    subclass: null,
    subclassReason: "notApplicable",
    checks: [],
    rules: RULES,
  };
}

function traceAffinities(analysis: LanguageAnalysis, dominant: string, className: ClassName): AffinityCheck[] {
  const checks: AffinityCheck[] = [];
  let subclassFound = false;

  for (const candidate of analysis.relevant) {
    if (candidate.name === dominant) continue;
    const candidateClass = classForLanguage(candidate.name);

    let outcome: AffinityOutcome;
    if (candidateClass === "Aventureiro") outcome = "noClass";
    else if (candidateClass === className) outcome = "sameClass";
    else if (candidate.relevantShare < RULES.subclassShare) outcome = "belowThreshold";
    else outcome = "subclass";

    // The engine takes the FIRST eligible language. Whatever comes after it was never considered.
    if (outcome === "subclass") {
      if (subclassFound) break;
      subclassFound = true;
    } else if (subclassFound) {
      break;
    }

    checks.push({
      language: candidate.name,
      className: candidateClass,
      share: candidate.share,
      relevantShare: candidate.relevantShare,
      outcome,
    });
  }
  return checks;
}

/**
 * @param archetype the engine's result for this character (the single source of truth for class and subclass)
 * @param languages the engine's language analysis of the same profile
 * @param coverage  coverage of the profile's language data
 */
export function buildClassExplanation(
  archetype: RPGArchetype,
  languages: LanguageAnalysis,
  coverage: DataCoverage
): ClassExplanation {
  if (coverage === "unavailable") return emptyExplanation("unavailable", archetype, coverage);

  const dominant = languages.languages.find((language) => language.name === archetype.dominantLanguage);
  if (!dominant) return emptyExplanation("noLanguages", archetype, coverage);

  const checks = traceAffinities(languages, dominant.name, archetype.className);

  const subclassLanguage = archetype.subclassName
    ? languages.relevant.find((language) => language.name === archetype.subclassLanguage)
    : undefined;
  const subclass =
    archetype.subclassName && subclassLanguage
      ? {
          className: archetype.subclassName,
          language: subclassLanguage.name,
          share: subclassLanguage.share,
          relevantShare: subclassLanguage.relevantShare,
        }
      : null;

  let subclassReason: SubclassReason;
  if (subclass) subclassReason = "assigned";
  else if (checks.some((check) => check.outcome === "belowThreshold")) subclassReason = "belowThreshold";
  else if (checks.length > 0) subclassReason = "noDistinctAffinity";
  else subclassReason = "noOtherLanguage";

  return {
    status: archetype.className === "Aventureiro" ? "unmappedLanguage" : "language",
    coverage,
    className: archetype.className,
    dominant: { language: dominant.name, share: dominant.share },
    subclass,
    subclassReason,
    checks,
    rules: RULES,
  };
}
