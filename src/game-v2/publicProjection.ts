import { presentAchievementV2 } from "./achievements";
import { ARCHETYPE_NAMES } from "./constants";
import { EVOLUTION_CATALOG } from "./decisions";
import type {
  ConfidenceLevel,
  CoverageState,
  LocalizedText,
  PracticeArchetype,
  RarityV2,
  RPGCharacterV2,
  TechnologyAffinity,
} from "./types";
import type { V2DeliveryState } from "./delivery";
import type { V2DeliveryResult } from "./delivery";

export interface PublicTechnologyV2 {
  id: string;
  name: string;
  score: number | null;
  confidence: ConfidenceLevel;
  coverage: CoverageState;
  repositoryCount: number;
}

export interface PublicAchievementV2Localized {
  id: string;
  origin: "v1" | "v2";
  name: LocalizedText;
  description: LocalizedText;
  category: string;
  rarity: RarityV2;
  unlocked: boolean;
  secret: boolean;
  coverage: CoverageState;
  progress: number | null;
  target: number | null;
}

export interface PublicTitleV2Localized {
  id: string;
  origin: "v1" | "v2";
  name: LocalizedText;
  description: LocalizedText;
  category: string;
  rarity: RarityV2;
  unlocked: boolean;
}

export interface RPGCharacterV2Public {
  engineVersion: RPGCharacterV2["engineVersion"];
  identity: {
    className: string;
    subclass: { id: PracticeArchetype; name: LocalizedText } | null;
    evolution: { id: string; name: LocalizedText; rarity: RarityV2 } | null;
  };
  grimoire: {
    affinities: RPGCharacterV2["grimoire"]["affinities"];
    schools: PublicTechnologyV2[];
    artifacts: PublicTechnologyV2[];
  };
  achievements: PublicAchievementV2Localized[];
  titles: PublicTitleV2Localized[];
  defaultTitleId: string | null;
  explanation: {
    class: { name: string; reason: LocalizedText };
    subclass: { name: LocalizedText | null; reason: LocalizedText; status: RPGCharacterV2["subclass"]["status"] };
    evolution: { name: LocalizedText | null; reason: LocalizedText; status: RPGCharacterV2["evolution"]["status"] };
  };
  coverage: { schools: CoverageState; artifacts: CoverageState };
  calculationCoverage: RPGCharacterV2["calculationCoverage"];
}

export interface CharacterPresentationModel {
  v2Enabled: boolean;
  delivery: V2DeliveryState;
  v2: RPGCharacterV2Public | null;
}

export function resolvePublicEquippedTitle(
  titles: readonly PublicTitleV2Localized[],
  savedTitleId: string | undefined,
  defaultTitleId: string | null
): PublicTitleV2Localized | null {
  const saved = savedTitleId ? titles.find((title) => title.id === savedTitleId && title.unlocked) : undefined;
  if (saved) return saved;
  return defaultTitleId ? titles.find((title) => title.id === defaultTitleId && title.unlocked) ?? null : null;
}

export function createCharacterPresentationModel(
  v2Enabled: boolean,
  result?: Pick<V2DeliveryResult, "state" | "character">
): CharacterPresentationModel {
  if (!v2Enabled) return { v2Enabled: false, delivery: "unavailable", v2: null };
  return {
    v2Enabled: true,
    delivery: result?.state ?? "unavailable",
    v2: result?.character ? projectRPGCharacterV2Public(result.character) : null,
  };
}

function projectTechnology(items: TechnologyAffinity[]): PublicTechnologyV2[] {
  return items.map(({ id, name, score, confidence, coverage, evidenceRepoCount }) => ({
    id,
    name,
    score,
    confidence,
    coverage,
    repositoryCount: evidenceRepoCount,
  }));
}

function subclassReason(character: RPGCharacterV2): LocalizedText {
  if (character.subclass.value) {
    return character.subclass.coverage === "partial"
      ? {
          pt: "As evidências observadas sustentam esta especialização mesmo considerando as informações ainda incompletas.",
          en: "The observed evidence supports this specialization even with some information still incomplete.",
        }
      : {
          pt: "As evidências observadas sustentam uma prática técnica dominante para esta especialização.",
          en: "The observed evidence supports a dominant technical practice for this specialization.",
        };
  }
  if (character.subclass.reasonCode === "margin_insufficient" || character.subclass.reasonCode === "partial_can_change_winner") {
    return {
      pt: "Há sinais de mais de uma especialização, mas nenhuma domina com segurança.",
      en: "There are signals for more than one specialization, but none dominates safely.",
    };
  }
  if (character.subclass.reasonCode === "evidence_unavailable") {
    return {
      pt: "As evidências necessárias para definir uma especialização não estão disponíveis no momento.",
      en: "The evidence needed to define a specialization is not available right now.",
    };
  }
  return {
    pt: "A jornada ainda não apresenta evidência suficiente para uma especialização.",
    en: "The journey does not yet show enough evidence for a specialization.",
  };
}

/**
 * Client-safe projection. Evidence refs, bounds, diagnostics, raw requirements,
 * request accounting and cache/provider details intentionally stop here.
 */
export function projectRPGCharacterV2Public(character: RPGCharacterV2): RPGCharacterV2Public {
  const subclassName = character.subclass.value ? ARCHETYPE_NAMES[character.subclass.value] : null;
  const evolution = character.evolution.value
    ? EVOLUTION_CATALOG.find((candidate) => candidate.id === character.evolution.value) ?? null
    : null;

  const achievements = character.achievements.map((achievement) => {
    const pt = presentAchievementV2(achievement, "pt-BR");
    const en = presentAchievementV2(achievement, "en");
    return {
      id: achievement.id,
      origin: achievement.origin,
      name: { pt: pt.name, en: en.name },
      description: { pt: pt.description, en: en.description },
      category: achievement.category,
      rarity: achievement.rarity,
      unlocked: achievement.unlocked,
      secret: achievement.secret,
      coverage: achievement.coverage,
      progress: achievement.secret && !achievement.unlocked ? null : achievement.progress,
      target: achievement.secret && !achievement.unlocked ? null : achievement.target,
    } satisfies PublicAchievementV2Localized;
  });

  return {
    engineVersion: character.engineVersion,
    identity: {
      className: character.class.value,
      subclass: character.subclass.value && subclassName ? { id: character.subclass.value, name: subclassName } : null,
      evolution: evolution ? { id: evolution.id, name: evolution.name, rarity: evolution.rarity } : null,
    },
    grimoire: {
      affinities: character.grimoire.affinities,
      schools: projectTechnology(character.grimoire.schools),
      artifacts: projectTechnology(character.grimoire.artifacts),
    },
    achievements,
    titles: character.titles.map((title) => ({
      id: title.id,
      origin: title.origin,
      name: title.name,
      description: title.lore,
      category: title.category,
      rarity: title.rarity,
      unlocked: title.unlocked,
    })),
    defaultTitleId: character.defaultTitleId,
    explanation: {
      class: { name: character.class.value, reason: character.class.reason },
      subclass: { name: subclassName, reason: subclassReason(character), status: character.subclass.status },
      evolution: { name: evolution?.name ?? null, reason: character.evolution.reason, status: character.evolution.status },
    },
    coverage: {
      schools: character.coverage.schools,
      artifacts: character.coverage.artifacts,
    },
    calculationCoverage: character.calculationCoverage,
  };
}
