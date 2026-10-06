import { NEXT_MILESTONES_COUNT } from "../constants";
import { evaluateThreshold, progressRatio, type ProgressMetrics } from "../progress";
import type { AchievementCategory, AchievementProgress, MetricUnit, Rarity } from "../types";

/**
 * Achievements are an independent layer: they never grant XP.
 * All of them are cumulative (a 11-year account holds the 1, 3, 5 and 10-year ones).
 * Only OWN repositories count; forks do not.
 */
interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: AchievementCategory;
  unit: MetricUnit;
  target: number;
}

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  // Account age (cumulative)
  { id: "age-1", name: "Primeiro Capítulo", description: "Conta no GitHub com 1 ano de história.", rarity: "common", category: "age", unit: "years", target: 1 },
  { id: "age-3", name: "Cronista do Código", description: "Conta no GitHub com 3 anos de história.", rarity: "rare", category: "age", unit: "years", target: 3 },
  { id: "age-5", name: "Antigo Guardião", description: "Conta no GitHub com 5 anos de história.", rarity: "epic", category: "age", unit: "years", target: 5 },
  { id: "age-10", name: "Lenda dos Repositórios", description: "Conta no GitHub com 10 anos de história.", rarity: "legendary", category: "age", unit: "years", target: 10 },
  { id: "age-15", name: "Ancião do Código", description: "Conta no GitHub com 15 anos de história.", rarity: "legendary", category: "age", unit: "years", target: 15 },

  // Own repositories
  { id: "repos-1", name: "Primeiro Repositório", description: "Publique seu primeiro repositório próprio.", rarity: "common", category: "repositories", unit: "repositories", target: 1 },
  { id: "repos-5", name: "Explorador", description: "Publique 5 repositórios próprios.", rarity: "common", category: "repositories", unit: "repositories", target: 5 },
  { id: "repos-25", name: "Senhor dos Repositórios", description: "Publique 25 repositórios próprios.", rarity: "rare", category: "repositories", unit: "repositories", target: 25 },
  { id: "repos-50", name: "Construtor de Reinos", description: "Publique 50 repositórios próprios.", rarity: "epic", category: "repositories", unit: "repositories", target: 50 },
  { id: "repos-100", name: "Arquiteto de Mundos", description: "Publique 100 repositórios próprios.", rarity: "legendary", category: "repositories", unit: "repositories", target: 100 },

  // Commits
  { id: "commits-100", name: "Primeiros Golpes", description: "Alcance 100 commits.", rarity: "common", category: "commits", unit: "commits", target: 100 },
  { id: "commits-1000", name: "Código em Chamas", description: "Alcance 1.000 commits.", rarity: "rare", category: "commits", unit: "commits", target: 1_000 },
  { id: "commits-5000", name: "Tempestade de Código", description: "Alcance 5.000 commits.", rarity: "epic", category: "commits", unit: "commits", target: 5_000 },
  { id: "commits-10000", name: "Forjador Incansável", description: "Alcance 10.000 commits.", rarity: "legendary", category: "commits", unit: "commits", target: 10_000 },

  // Pull requests
  { id: "prs-1", name: "Primeiro Aliado", description: "Abra seu primeiro pull request.", rarity: "common", category: "pullRequests", unit: "pullRequests", target: 1 },
  { id: "prs-25", name: "Guardião Open Source", description: "Abra 25 pull requests.", rarity: "rare", category: "pullRequests", unit: "pullRequests", target: 25 },
  { id: "prs-100", name: "Campeão da Colaboração", description: "Abra 100 pull requests.", rarity: "epic", category: "pullRequests", unit: "pullRequests", target: 100 },
  { id: "prs-500", name: "Herói da Comunidade", description: "Abra 500 pull requests.", rarity: "legendary", category: "pullRequests", unit: "pullRequests", target: 500 },

  // Code reviews (a participation record, not proof of professional quality)
  { id: "reviews-10", name: "Olhar Atento", description: "Participe de 10 code reviews.", rarity: "common", category: "reviews", unit: "reviews", target: 10 },
  { id: "reviews-50", name: "Vigia do Código", description: "Participe de 50 code reviews.", rarity: "rare", category: "reviews", unit: "reviews", target: 50 },
  { id: "reviews-200", name: "Guardião da Qualidade", description: "Participe de 200 code reviews.", rarity: "epic", category: "reviews", unit: "reviews", target: 200 },

  // Issues
  { id: "issues-10", name: "Caçador de Bugs", description: "Abra 10 issues.", rarity: "common", category: "issues", unit: "issues", target: 10 },
  { id: "issues-50", name: "Caçador de Recompensas", description: "Abra 50 issues.", rarity: "rare", category: "issues", unit: "issues", target: 50 },
  { id: "issues-200", name: "Exterminador de Bugs", description: "Abra 200 issues.", rarity: "epic", category: "issues", unit: "issues", target: 200 },

  // Stars received on own repositories
  { id: "stars-1", name: "Primeira Centelha", description: "Receba sua primeira estrela em um repositório próprio.", rarity: "common", category: "stars", unit: "stars", target: 1 },
  { id: "stars-25", name: "Brilho Crescente", description: "Receba 25 estrelas em seus repositórios.", rarity: "rare", category: "stars", unit: "stars", target: 25 },
  { id: "stars-100", name: "Constelação", description: "Receba 100 estrelas em seus repositórios.", rarity: "epic", category: "stars", unit: "stars", target: 100 },
  { id: "stars-1000", name: "Farol dos Reinos", description: "Receba 1.000 estrelas em seus repositórios.", rarity: "legendary", category: "stars", unit: "stars", target: 1_000 },

  // Relevant languages (>= 5% of the usage)
  { id: "languages-2", name: "Primeiro Encantamento", description: "Use 2 linguagens relevantes.", rarity: "common", category: "languages", unit: "languages", target: 2 },
  { id: "languages-5", name: "Poliglota", description: "Use 5 linguagens relevantes.", rarity: "rare", category: "languages", unit: "languages", target: 5 },
  { id: "languages-8", name: "Mestre das Afinidades", description: "Use 8 linguagens relevantes.", rarity: "epic", category: "languages", unit: "languages", target: 8 },
];

export function evaluateAchievements(metrics: ProgressMetrics): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    rarity: def.rarity,
    category: def.category,
    ...evaluateThreshold(metrics[def.unit], def.target, def.unit),
  }));
}

/**
 * Next goals: the first locked achievement of each category (age excluded, it cannot be
 * "worked on"), closest to completion first. Ties keep definition order, so an empty profile
 * gets "Primeiro Repositório", "Primeiros Golpes", "Primeiro Aliado".
 */
export function selectNextMilestones(achievements: readonly AchievementProgress[]): AchievementProgress[] {
  const firstLockedByCategory = new Map<AchievementCategory, AchievementProgress>();
  for (const a of achievements) {
    if (a.category === "age" || a.unlocked || a.coverage === "unavailable") continue;
    if (!firstLockedByCategory.has(a.category)) firstLockedByCategory.set(a.category, a);
  }

  return [...firstLockedByCategory.values()]
    .map((achievement, index) => ({ achievement, index, ratio: progressRatio(achievement) }))
    .sort((a, b) => b.ratio - a.ratio || a.index - b.index)
    .slice(0, NEXT_MILESTONES_COUNT)
    .map((entry) => entry.achievement);
}
