import type { ClassName, RPGCharacter } from "@/game/types";

export type DuelSide = "A" | "B";
export type DuelWinner = DuelSide | "draw";
export type DuelRoundId = "journey" | "arsenal" | "forge" | "legacy" | "signature";

export interface DuelModifier {
  className: ClassName;
  abilityKey: ClassName;
  amount: number;
}

export interface DuelRoundHero {
  power: number;
  basePower: number;
  hpAfter: number;
  modifier: DuelModifier | null;
  highlight:
    | { kind: "journey"; years: number; level: number }
    | { kind: "skill"; name: string }
    | { kind: "repositories"; value: number }
    | { kind: "stars"; value: number }
    | { kind: "archetype"; className: ClassName; subclassName?: ClassName };
}

export interface DuelRound {
  id: DuelRoundId;
  heroA: DuelRoundHero;
  heroB: DuelRoundHero;
  winner: DuelWinner;
  damage: number;
}

export interface DuelHero {
  character: RPGCharacter;
  initialHp: number;
  finalHp: number;
  mp: number;
}

export interface DuelResult {
  heroA: DuelHero;
  heroB: DuelHero;
  rounds: DuelRound[];
  scoreA: number;
  scoreB: number;
  winner: DuelWinner;
}

