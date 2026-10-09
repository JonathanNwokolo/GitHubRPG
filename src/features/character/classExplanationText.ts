import { getTranslation, type SupportedLanguage } from "@/i18n";
import { fill, formatNumber } from "@/lib/format";
import type { ClassName } from "@/game/types";
import type { AffinityCheck, ClassExplanation } from "./classExplanation";
import { localizeClassName } from "@/i18n/gameContent";

/**
 * Turns a ClassExplanation into sentences. It only picks and fills dictionary templates with the figures
 * of the explanation, so nothing can be said that the data did not state. Pure: no React, no clock.
 */

export interface ClassMappingView {
  language: string;
  className: ClassName;
  /** "TypeScript → Mago", already in the interface language. */
  text: string;
}

export interface ClassExplanationView {
  title: string;
  classHeading: string;
  /** The sentences that justify the class, in reading order. */
  classLines: string[];
  mapping: ClassMappingView | null;
  /** Null when there is nothing to say about a subclass (no dominant language). */
  subclassHeading: string | null;
  subclassLines: string[];
  subclassMapping: ClassMappingView | null;
  /** "Partial data" caveat, only when the percentages are approximate. */
  partialNote: string | null;
  disclaimer: string;
}

function percent(ratio: number, language: SupportedLanguage): string {
  return `${formatNumber(ratio * 100, language)}%`;
}

/** The most useful single sentence about languages that did NOT become a subclass. */
function nearMiss(checks: AffinityCheck[]): AffinityCheck | undefined {
  return checks.find((check) => check.outcome === "belowThreshold");
}

export function describeClassExplanation(explanation: ClassExplanation, language: SupportedLanguage): ClassExplanationView {
  const t = getTranslation(language).classExplanation;
  const { className, dominant, subclass, rules } = explanation;
  const classLabel = localizeClassName(className, language);
  const thresholds = {
    threshold: percent(rules.subclassShare, language),
    relevantMin: percent(rules.relevantShare, language),
  };

  const classLines: string[] = [];
  let mapping: ClassMappingView | null = null;

  switch (explanation.status) {
    case "language":
      if (dominant) {
        classLines.push(
          fill(t.dominant, { language: dominant.language }),
          fill(t.dominantShare, { language: dominant.language, share: percent(dominant.share, language) })
        );
        mapping = {
          language: dominant.language,
          className,
          text: fill(t.mapping, { language: dominant.language, class: classLabel }),
        };
      }
      break;
    case "unmappedLanguage":
      if (dominant) {
        classLines.push(
          fill(t.unmapped, { language: dominant.language, class: classLabel }),
          fill(t.dominantShare, { language: dominant.language, share: percent(dominant.share, language) })
        );
      }
      break;
    case "noLanguages":
      classLines.push(fill(t.noLanguages, { class: classLabel }));
      break;
    case "unavailable":
      classLines.push(fill(t.unavailable, { class: classLabel }));
      break;
  }

  const subclassLines: string[] = [];
  let subclassMapping: ClassMappingView | null = null;

  // Same-class languages that were weighed and skipped (JavaScript next to TypeScript), most relevant first.
  for (const check of explanation.checks.filter((c) => c.outcome === "sameClass")) {
    subclassLines.push(fill(t.sameClass, { language: check.language, share: percent(check.share, language), class: localizeClassName(check.className, language) }));
  }

  if (subclass) {
    // Skipped same-class languages come first: "JavaScript also points to Mago... HTML is the next eligible one".
    subclassLines.push(
      fill(t.subclassAssigned, { language: subclass.language }),
      fill(t.subclassShare, { share: percent(subclass.share, language), relevant: percent(subclass.relevantShare, language) })
    );
    subclassMapping = {
      language: subclass.language,
      className: subclass.className,
      text: fill(t.mapping, { language: subclass.language, class: localizeClassName(subclass.className, language) }),
    };
    subclassLines.push(fill(t.subclassRule, thresholds));
  } else {
    switch (explanation.subclassReason) {
      case "belowThreshold": {
        const miss = nearMiss(explanation.checks);
        if (miss) {
          subclassLines.push(
            fill(t.belowThreshold, {
              language: miss.language,
              class: localizeClassName(miss.className, language),
              relevant: percent(miss.relevantShare, language),
              threshold: thresholds.threshold,
            })
          );
        }
        break;
      }
      case "noDistinctAffinity":
        subclassLines.push(t.noDistinctAffinity);
        break;
      case "noOtherLanguage":
        subclassLines.push(fill(t.noOtherLanguage, thresholds));
        break;
      case "assigned":
      case "notApplicable":
        break;
    }
  }

  return {
    title: fill(t.title, { class: classLabel }),
    classHeading: t.classHeading,
    classLines,
    mapping,
    subclassHeading: explanation.subclassReason === "notApplicable" ? null : t.subclassHeading,
    subclassLines,
    subclassMapping,
    partialNote: explanation.coverage === "partial" ? t.partialNote : null,
    disclaimer: t.disclaimer,
  };
}
