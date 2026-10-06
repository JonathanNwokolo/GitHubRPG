import { LANGUAGE_RULES } from "./constants";
import type { LanguageUsage } from "./types";

export interface LanguageShare {
  name: string;
  bytes: number;
  repoCount: number;
  /** bytes / totalBytes, 0-1. */
  share: number;
}

export interface RelevantLanguage extends LanguageShare {
  /** share renormalized over relevant languages only, 0-1. */
  relevantShare: number;
}

export interface LanguageAnalysis {
  totalBytes: number;
  /** Sorted by bytes desc, then name asc (deterministic ties). */
  languages: LanguageShare[];
  /** Languages with share >= LANGUAGE_RULES.relevantShare, same order. */
  relevant: RelevantLanguage[];
}

/**
 * Aggregates language usage ONCE per character; classes, versatility, skills,
 * achievements and titles all reuse this result.
 */
export function analyzeLanguages(usages: readonly LanguageUsage[]): LanguageAnalysis {
  const positive = usages.filter((u) => u.bytes > 0);
  let totalBytes = 0;
  for (const u of positive) totalBytes += u.bytes;

  if (totalBytes === 0) return { totalBytes: 0, languages: [], relevant: [] };

  const languages: LanguageShare[] = positive
    .map((u) => ({ name: u.name, bytes: u.bytes, repoCount: u.repoCount, share: u.bytes / totalBytes }))
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name, "en"));

  const relevantBase = languages.filter((l) => l.share >= LANGUAGE_RULES.relevantShare);
  let relevantBytes = 0;
  for (const l of relevantBase) relevantBytes += l.bytes;

  const relevant: RelevantLanguage[] = relevantBase.map((l) => ({
    ...l,
    relevantShare: l.bytes / relevantBytes,
  }));

  return { totalBytes, languages, relevant };
}
