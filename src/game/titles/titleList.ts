import { evaluateThreshold, type ProgressMetrics } from "../progress";
import type {
  ClassName,
  CombinationTitleProgress,
  MetricUnit,
  RPGArchetype,
  ThresholdTitleProgress,
  TitleCategory,
  TitleProgress,
} from "../types";

/**
 * Titles are not achievements. A user can unlock many; only one is equipped.
 * The engine only decides what is unlocked and the default; the UI stores the user's pick.
 */
type ThresholdCategory = Exclude<TitleCategory, "class">;

interface ThresholdTitleDefinition {
  id: string;
  name: string;
  description: string;
  category: ThresholdCategory;
  unit: MetricUnit;
  target: number;
}

type TierSpec = readonly [name: string, target: number];

function ladder(
  category: ThresholdCategory,
  unit: MetricUnit,
  slug: string,
  describe: (target: number) => string,
  tiers: readonly TierSpec[]
): ThresholdTitleDefinition[] {
  return tiers.map(([name, target]) => ({
    id: `title-${slug}-${target}`,
    name,
    description: describe(target),
    category,
    unit,
    target,
  }));
}

const THRESHOLD_TITLES: readonly ThresholdTitleDefinition[] = [
  ...ladder("reputation", "stars", "stars", (t) => `${t.toLocaleString("pt-BR")}+ estrelas recebidas`, [
    ["Portador da Centelha", 10],
    ["Caçador de Estrelas", 50],
    ["Senhor das Estrelas", 100],
    ["Arauto das Constelações", 500],
    ["Lenda Celestial", 1_000],
  ]),
  ...ladder("activity", "commits", "commits", (t) => `${t.toLocaleString("pt-BR")}+ commits`, [
    ["Forjador de Código", 500],
    ["Incansável", 1_000],
    ["Mestre da Forja", 5_000],
    ["Forjador Eterno", 10_000],
  ]),
  ...ladder("collaboration", "pullRequests", "prs", (t) => `${t.toLocaleString("pt-BR")}+ pull requests`, [
    ["Aliado do Código", 10],
    ["Emissário Open Source", 50],
    ["Guardião da Comunidade", 100],
    ["Campeão dos Reinos Abertos", 500],
  ]),
  ...ladder("versatility", "languages", "languages", (t) => `${t} linguagens relevantes`, [
    ["Explorador Arcano", 3],
    ["Poliglota das Runas", 5],
    ["Mestre das Afinidades", 8],
  ]),
  ...ladder("longevity", "years", "years", (t) => `${t}+ anos de conta`, [
    ["Cronista", 3],
    ["Guardião Ancestral", 5],
    ["Lenda dos Repositórios", 10],
    ["Ancião do Código", 15],
  ]),
];

interface CombinationTitleDefinition {
  id: string;
  name: string;
  className: ClassName;
  subclassName: ClassName;
}

/** Unlocked automatically by the class + subclass pair. No randomness. */
export const COMBINATION_TITLES: readonly CombinationTitleDefinition[] = [
  { id: "title-class-mago-alquimista", name: "Arcanista do Código", className: "Mago", subclassName: "Alquimista" },
  { id: "title-class-mago-guerreiro", name: "Cavaleiro Rúnico", className: "Mago", subclassName: "Guerreiro" },
  { id: "title-class-mago-bardo", name: "Tecelão de Interfaces", className: "Mago", subclassName: "Bardo" },
  { id: "title-class-alquimista-guerreiro", name: "Ferreiro Arcano", className: "Alquimista", subclassName: "Guerreiro" },
  { id: "title-class-paladino-mago", name: "Guardião Arcano", className: "Paladino", subclassName: "Mago" },
  { id: "title-class-patrulheiro-alquimista", name: "Explorador de Sistemas", className: "Patrulheiro", subclassName: "Alquimista" },
  { id: "title-class-ladino-mago", name: "Ilusionista do Terminal", className: "Ladino", subclassName: "Mago" },
];

/** Lower tier-of-ladder = less prestige. Used only to pick the default equipped title. */
const CATEGORY_ORDER: readonly TitleCategory[] = [
  "reputation",
  "activity",
  "collaboration",
  "versatility",
  "longevity",
  "class",
];

export function evaluateTitles(metrics: ProgressMetrics, archetype: RPGArchetype): TitleProgress[] {
  const seenLocked = new Set<TitleCategory>();

  const thresholds: ThresholdTitleProgress[] = THRESHOLD_TITLES.map((def) => {
    const progress = evaluateThreshold(metrics[def.unit], def.target, def.unit);
    const isNext = !progress.unlocked && !seenLocked.has(def.category);
    if (!progress.unlocked) seenLocked.add(def.category);
    return {
      kind: "threshold",
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      isNext,
      ...progress,
    };
  });

  const combinations: CombinationTitleProgress[] = COMBINATION_TITLES.map((def) => {
    const classMet = archetype.className === def.className;
    const subclassMet = archetype.subclassName === def.subclassName;
    return {
      kind: "combination",
      id: def.id,
      name: def.name,
      description: `Classe ${def.className} + subclasse ${def.subclassName}`,
      category: "class",
      unlocked: classMet && subclassMet,
      requirements: [
        { kind: "class", value: def.className, met: classMet },
        { kind: "subclass", value: def.subclassName, met: subclassMet },
      ],
    };
  });

  return [...thresholds, ...combinations];
}

/**
 * Default title = unlocked title that sits highest in its own ladder
 * (combination titles rank as the top of their ladder). Ties follow CATEGORY_ORDER.
 */
export function selectDefaultTitleId(titles: readonly TitleProgress[]): string | null {
  const positionInLadder = new Map<string, number>();
  const ladderSize = new Map<TitleCategory, number>();
  for (const t of titles) ladderSize.set(t.category, (ladderSize.get(t.category) ?? 0) + 1);
  const counters = new Map<TitleCategory, number>();
  for (const t of titles) {
    const index = counters.get(t.category) ?? 0;
    counters.set(t.category, index + 1);
    positionInLadder.set(t.id, t.kind === "combination" ? 1 : (index + 1) / (ladderSize.get(t.category) ?? 1));
  }

  let best: { id: string; prestige: number; order: number } | null = null;
  for (const t of titles) {
    if (!t.unlocked) continue;
    const prestige = positionInLadder.get(t.id) ?? 0;
    const order = CATEGORY_ORDER.indexOf(t.category);
    if (!best || prestige > best.prestige || (prestige === best.prestige && order < best.order)) {
      best = { id: t.id, prestige, order };
    }
  }
  return best ? best.id : null;
}
