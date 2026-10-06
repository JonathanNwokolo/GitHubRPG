import { LANGUAGE_RULES, SKILL, SKILL_TIERS } from "../constants";
import type { LanguageAnalysis, LanguageShare } from "../languages";
import { clamp, clamp01, floorTo, logNormalize } from "../math";
import type { Skill, SkillTier } from "../types";

export function getSkillTier(level: number): SkillTier {
  const bounded = clamp(Math.round(level), SKILL.levelMin, SKILL.levelMax);
  const tier = SKILL_TIERS.find((t) => bounded >= t.min && bounded <= t.max);
  return (tier ? tier.name : SKILL_TIERS[0].name) as SkillTier;
}

/**
 * Raw affinity in [0, 1]: share (25%) + presence across repos (40%) + volume (35%).
 * Presence and volume are log-normalized in ABSOLUTE terms, so a single small repo
 * written 100% in one language cannot look like a veteran.
 */
export function rawSkillScore(language: LanguageShare): number {
  const w = SKILL.weights;
  const presence = logNormalize(language.repoCount, SKILL.presenceRepoReference);
  const volume = logNormalize(language.bytes / SKILL.volumeUnitBytes, SKILL.volumeUnitReference);
  return clamp01(language.share * w.share + presence * w.presence + volume * w.volume);
}

/** Non-linear curve (score ^ 1.5) mapped onto 1-20. */
export function skillLevelFromScore(rawScore: number): number {
  const curved = clamp01(rawScore) ** SKILL.curveExponent;
  const span = SKILL.levelMax - SKILL.levelMin;
  return clamp(SKILL.levelMin + Math.round(curved * span), SKILL.levelMin, SKILL.levelMax);
}

/** "C++" -> "cpp", "C#" -> "csharp", "Objective-C" -> "objective-c". */
function skillId(language: string): string {
  return language
    .toLowerCase()
    .replace(/\+/g, "p")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculateSkills(languages: LanguageAnalysis): Skill[] {
  return languages.languages
    .filter((l) => l.share >= LANGUAGE_RULES.skillMinShare)
    .map((l): Skill => {
      const level = skillLevelFromScore(rawSkillScore(l));
      return {
        id: skillId(l.name),
        name: l.name,
        level,
        tier: getSkillTier(level),
        sharePercent: floorTo(l.share * 100, 1),
        repoCount: l.repoCount,
      };
    })
    .sort((a, b) => b.level - a.level || b.sharePercent - a.sharePercent || a.name.localeCompare(b.name, "en"));
}
