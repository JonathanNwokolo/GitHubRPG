/**
 * Every balancing number of the Game Engine lives here.
 * Documented in GAME_BALANCE.md. Reference values are balancing anchors,
 * NOT real-world maximums.
 */

// --- Level / XP ------------------------------------------------------------
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 99;

/** Conceptual level curve: climbing n levels costs round(XP_CURVE_BASE * n ^ XP_CURVE_EXPONENT). */
export const XP_CURVE_BASE = 100;
export const XP_CURVE_EXPONENT = 1.5;

/** Applied to the progression score to slow the early game. */
export const PROGRESSION_CURVE_EXPONENT = 2.5;

export const XP_WEIGHTS = {
  commits: 0.4,
  pullRequests: 0.2,
  reviews: 0.15,
  issues: 0.1,
  repositories: 0.1,
  impact: 0.05,
} as const;

/** How stars and forks combine into the impact score (stars+forks = 5% of XP). */
export const IMPACT_WEIGHTS = { stars: 0.5, forks: 0.5 } as const;

export const LEVEL_TIERS = [
  { min: 1, max: 5, name: "Iniciante" },
  { min: 6, max: 15, name: "Aventureiro" },
  { min: 16, max: 30, name: "Experiente" },
  { min: 31, max: 50, name: "Veterano" },
  { min: 51, max: 70, name: "Mestre" },
  { min: 71, max: 90, name: "Elite" },
  { min: 91, max: 98, name: "Lendário" },
  { min: 99, max: 99, name: "Ascendente" },
] as const;

// --- Reference values for logNormalize ---------------------------------------
export const REFERENCE = {
  commits: 10_000,
  pullRequests: 1_000,
  reviews: 1_000,
  issues: 1_000,
  ownRepositories: 200,
  starsReceived: 5_000,
  forksReceived: 1_000,
  followers: 1_000,
  starredRepositories: 50,
  activeDays: 1_000,
  longestStreakDays: 365,
  /** Active days in the recent window that count as "fully active". */
  recentActiveDays: 150,
  /** Linear: age / this = 1. */
  accountAgeYears: 15,
  /** Relevant languages that count as "fully versatile". */
  relevantLanguages: 8,
} as const;

/** Days of the "recent activity" window the data layer must provide. */
export const RECENT_WINDOW_DAYS = 365;

// --- Attribute weights --------------------------------------------------------
export const STAT_WEIGHTS = {
  activity: { commits: 0.45, pullRequests: 0.2, issues: 0.1, reviews: 0.15, activeDays: 0.1 },
  experience: { accountAge: 0.2, repositories: 0.25, pullRequests: 0.25, reviews: 0.2, issues: 0.1 },
  reputation: { stars: 0.45, forks: 0.3, followers: 0.15, starredRepositories: 0.1 },
  versatility: { languageCount: 0.6, languageBalance: 0.4 },
  consistency: { activeDays: 0.4, distribution: 0.35, longestStreak: 0.15, recent: 0.1 },
} as const;

/** Recent activity may only add this fraction of the remaining headroom to Activity. */
export const ACTIVITY_RECENT_BONUS = 0.1;

/** Months of history needed for temporal distribution to count at full strength. */
export const CONSISTENCY_MATURITY_MONTHS = 12;
export const CONSISTENCY_DISTRIBUTION_WEIGHTS = { activeMonths: 0.6, evenness: 0.4 } as const;

// --- Languages / classes / skills ------------------------------------------------
export const LANGUAGE_RULES = {
  /** A language is "relevant" with at least this share of own-repo bytes. */
  relevantShare: 0.05,
  /** Subclass needs this share of the relevant-language usage. */
  subclassShare: 0.1,
  /** Languages below this share do not become skills. */
  skillMinShare: 0.03,
} as const;

export const SKILL = {
  weights: { share: 0.25, presence: 0.4, volume: 0.35 },
  /** Repositories containing the language that count as "fully present". */
  presenceRepoReference: 30,
  /** Volume is measured in units of this many bytes... */
  volumeUnitBytes: 10_000,
  /** ...and this many units count as "full volume" (5 MB of source). */
  volumeUnitReference: 500,
  curveExponent: 1.5,
  levelMin: 1,
  levelMax: 20,
} as const;

export const SKILL_TIERS = [
  { min: 1, max: 4, name: "Aprendiz" },
  { min: 5, max: 8, name: "Adepto" },
  { min: 9, max: 12, name: "Especialista" },
  { min: 13, max: 16, name: "Mestre" },
  { min: 17, max: 19, name: "Arquimestre" },
  { min: 20, max: 20, name: "Lendário" },
] as const;

// --- Resources (HP / MP) --------------------------------------------------------------
export const RESOURCES = {
  hp: { base: 100, perLevel: 4, perExperience: 2, perConsistency: 2 },
  mp: { base: 50, perLevel: 3, perVersatility: 2, perActivity: 2 },
} as const;

/** How many next milestones the character exposes. */
export const NEXT_MILESTONES_COUNT = 3;
