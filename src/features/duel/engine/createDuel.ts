import type { ClassName, RPGCharacter } from "@/game/types";
import { clampPower, normalizeLog, weightedPower } from "./normalizeDuelMetric";
import type { DuelModifier, DuelResult, DuelResultType, DuelRound, DuelRoundHero, DuelRoundId, DuelWinner } from "./types";
import { computeOfficialDuelScore, evaluateCreatorOverride } from "./creatorOverride";

const ROUND_ORDER: DuelRoundId[] = ["journey", "arsenal", "forge", "legacy", "signature"];
const CLASS_AFFINITIES: Record<ClassName, { round: DuelRoundId; amount: number }> = {
  Mago: { round: "arsenal", amount: 6 },
  Alquimista: { round: "arsenal", amount: 5 },
  Guerreiro: { round: "forge", amount: 6 },
  Patrulheiro: { round: "forge", amount: 5 },
  Paladino: { round: "journey", amount: 6 },
  Bardo: { round: "signature", amount: 6 },
  Ladino: { round: "arsenal", amount: 5 },
  Oráculo: { round: "legacy", amount: 6 },
  Escriba: { round: "legacy", amount: 5 },
  Sentinela: { round: "journey", amount: 5 },
  Tecelão: { round: "signature", amount: 5 },
  Aventureiro: { round: "signature", amount: 4 },
};

interface BaseRoundPower {
  power: number;
  highlight: DuelRoundHero["highlight"];
}

function metricValue(metric: { value: number }): number {
  return Number.isFinite(metric.value) ? Math.max(0, metric.value) : 0;
}

function skillData(character: RPGCharacter): { mainPower: number; diversity: number; presence: number; highlight: string } {
  const skills = [...character.skills].sort((a, b) => b.sharePercent - a.sharePercent || b.level - a.level);
  const main = skills[0];
  return {
    mainPower: main ? (main.level / 20) * 100 : 0,
    diversity: Math.min(100, skills.length * 20),
    presence: main ? normalizeLog(main.repoCount, 30) : 0,
    highlight: main?.name ?? character.archetype.className,
  };
}

function basePower(character: RPGCharacter, round: DuelRoundId): BaseRoundPower {
  const { stats, summary, progression } = character;
  if (round === "journey") {
    return {
      power: weightedPower([
        [stats.experience, 0.45],
        [stats.consistency, 0.3],
        [progression.level, 0.15],
        [normalizeLog(summary.accountAgeYears, 20), 0.1],
      ]),
      highlight: { kind: "journey", years: summary.accountAgeYears, level: progression.level },
    };
  }
  if (round === "arsenal") {
    const skill = skillData(character);
    return {
      power: weightedPower([
        [skill.mainPower, 0.45],
        [stats.versatility, 0.3],
        [skill.diversity, 0.15],
        [skill.presence, 0.1],
      ]),
      highlight: { kind: "skill", name: skill.highlight },
    };
  }
  if (round === "forge") {
    return {
      power: weightedPower([
        [stats.activity, 0.45],
        [stats.consistency, 0.25],
        [normalizeLog(metricValue(summary.ownRepositories), 100), 0.15],
        [normalizeLog(metricValue(summary.commits), 10_000), 0.15],
      ]),
      highlight: { kind: "repositories", value: metricValue(summary.ownRepositories) },
    };
  }
  if (round === "legacy") {
    return {
      power: weightedPower([
        [stats.reputation, 0.55],
        [normalizeLog(metricValue(summary.starsReceived), 10_000), 0.3],
        [normalizeLog(metricValue(summary.followers), 10_000), 0.15],
      ]),
      highlight: { kind: "stars", value: metricValue(summary.starsReceived) },
    };
  }

  const values = Object.values(stats).sort((a, b) => b - a);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const specialization = clampPower((values[0] ?? 0) - (values[1] ?? 0) + 50);
  return {
    power: weightedPower([
      [values[0] ?? 0, 0.55],
      [average, 0.25],
      [specialization, 0.2],
    ]),
    highlight: {
      kind: "archetype",
      className: character.archetype.className,
      subclassName: character.archetype.subclassName,
    },
  };
}

function modifierFor(character: RPGCharacter, round: DuelRoundId): DuelModifier | null {
  const primary = CLASS_AFFINITIES[character.archetype.className];
  const secondary = character.archetype.subclassName ? CLASS_AFFINITIES[character.archetype.subclassName] : null;
  const amount = (primary.round === round ? primary.amount : 0) + (secondary?.round === round ? 2 : 0);
  return amount > 0
    ? { className: character.archetype.className, abilityKey: character.archetype.className, amount: Math.min(8, amount) }
    : null;
}

function compare(powerA: number, powerB: number): DuelWinner {
  if (Math.abs(powerA - powerB) <= 1) return "draw";
  return powerA > powerB ? "A" : "B";
}

function roundHero(base: BaseRoundPower, modifier: DuelModifier | null, hpAfter: number): DuelRoundHero {
  return {
    basePower: base.power,
    power: clampPower(base.power + (modifier?.amount ?? 0)),
    hpAfter,
    modifier,
    highlight: base.highlight,
  };
}

export function createDuel(characterA: RPGCharacter, characterB: RPGCharacter): DuelResult {
  let hpA = 100;
  let hpB = 100;
  let scoreA = 0;
  let scoreB = 0;

  const rounds: DuelRound[] = ROUND_ORDER.map((id) => {
    const baseA = basePower(characterA, id);
    const baseB = basePower(characterB, id);
    const modifierA = modifierFor(characterA, id);
    const modifierB = modifierFor(characterB, id);
    const powerA = clampPower(baseA.power + (modifierA?.amount ?? 0));
    const powerB = clampPower(baseB.power + (modifierB?.amount ?? 0));
    const winner = compare(powerA, powerB);
    const damage = winner === "draw" ? 0 : Math.min(28, Math.max(8, Math.round(8 + Math.abs(powerA - powerB) * 0.2)));
    if (winner === "A") {
      scoreA += 1;
      hpB = Math.max(0, hpB - damage);
    } else if (winner === "B") {
      scoreB += 1;
      hpA = Math.max(0, hpA - damage);
    }
    return {
      id,
      heroA: roundHero(baseA, modifierA, hpA),
      heroB: roundHero(baseB, modifierB, hpB),
      winner,
      damage,
    };
  });

  const defaultWinner: DuelWinner = scoreA === scoreB ? "draw" : scoreA > scoreB ? "A" : "B";
  const override = evaluateCreatorOverride(characterA, characterB, scoreA, scoreB);

  const winner: DuelWinner = override.triggered && override.creatorSide ? override.creatorSide : defaultWinner;
  const resultType: DuelResultType = override.triggered
    ? "creator_override"
    : defaultWinner === "draw"
      ? "legendary_draw"
      : "normal";
  const creatorOverride = override.triggered;
  const officialScores = computeOfficialDuelScore(
    scoreA,
    scoreB,
    override.triggered ? override.creatorSide : null
  );

  return {
    heroA: { character: characterA, initialHp: 100, finalHp: hpA, mp: characterA.resources.mp },
    heroB: { character: characterB, initialHp: 100, finalHp: hpB, mp: characterB.resources.mp },
    rounds,
    scoreA,
    scoreB,
    officialScoreA: officialScores.scoreA,
    officialScoreB: officialScores.scoreB,
    winner,
    resultType,
    creatorOverride,
  };
}

