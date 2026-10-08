import type { RPGCharacter } from "@/game/types";
import type { HeroCategoryId } from "./featuredHeroes";

export interface HallScoreHero {
  username: string;
  level: number;
  starsReceived: number;
  accountAgeYears: number;
  languageAffinities: readonly { name: string; sharePercent: number }[];
}

const WEB_AFFINITIES = new Set([
  "javascript",
  "typescript",
  "html",
  "css",
  "react",
  "next.js",
  "vue",
  "angular",
  "svelte",
]);

const WEB_FOCUS_MIN_PERCENT = 50;
const WEB_FOCUS_BONUS = 150;
const BASE_AGE_WEIGHT = 40;
const GUARDIAN_AGE_WEIGHT = 50;

export function toHallScoreHero(character: RPGCharacter): HallScoreHero {
  return {
    username: character.identity.username,
    level: character.progression.level,
    starsReceived: character.summary.starsReceived.value,
    accountAgeYears: character.summary.accountAgeYears,
    languageAffinities: character.skills.map(({ name, sharePercent }) => ({ name, sharePercent })),
  };
}

export function hasWebFocus(hero: HallScoreHero): boolean {
  const webShare = hero.languageAffinities.reduce(
    (total, affinity) => total + (WEB_AFFINITIES.has(affinity.name.toLowerCase()) ? affinity.sharePercent : 0),
    0
  );
  return webShare >= WEB_FOCUS_MIN_PERCENT;
}

export function calculateHallScore(hero: HallScoreHero, category: HeroCategoryId): number {
  const ageWeight = category === "guardians" ? GUARDIAN_AGE_WEIGHT : BASE_AGE_WEIGHT;
  const webBonus = category === "web" && hasWebFocus(hero) ? WEB_FOCUS_BONUS : 0;
  return hero.level * 100
    + Math.log10(hero.starsReceived + 1) * 250
    + hero.accountAgeYears * ageWeight
    + webBonus;
}

function compareUsernames(left: string, right: string): number {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft !== normalizedRight) return normalizedLeft < normalizedRight ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function orderHallHeroes<T extends HallScoreHero>(heroes: readonly T[], category: HeroCategoryId): T[] {
  return [...heroes].sort((left, right) =>
    calculateHallScore(right, category) - calculateHallScore(left, category)
    || right.level - left.level
    || right.starsReceived - left.starsReceived
    || compareUsernames(left.username, right.username)
  );
}
