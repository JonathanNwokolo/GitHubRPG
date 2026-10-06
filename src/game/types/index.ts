/**
 * Domain types of the Game Engine V1.
 * Pure TypeScript: no React, no DOM, no network.
 */

// ---------------------------------------------------------------------------
// Input: DeveloperProfile (output of data/normalize, input of the engine)
// ---------------------------------------------------------------------------

/**
 * How much of a metric's real history we managed to observe.
 * - full: exact value, progress may be shown as exact;
 * - partial: lower bound ("at least value"), never claim "X remaining";
 * - unavailable: unknown, never invent a value.
 */
export type DataCoverage = "full" | "partial" | "unavailable";

export interface Metric {
  /** Observed value. Always 0 when coverage is "unavailable". */
  value: number;
  coverage: DataCoverage;
}

export interface LanguageUsage {
  name: string;
  /** Bytes of this language across the user's own (non-fork) repositories. */
  bytes: number;
  /** Number of own repositories that contain this language. */
  repoCount: number;
}

export interface DeveloperProfile {
  username: string;
  displayName?: string;
  bio?: string;
  location?: string;
  company?: string;
  /** ISO date of account creation. */
  accountCreatedAt: string;
  /** ISO date the engine treats as "now". Keeps the engine deterministic. */
  referenceDate: string;
  isDemo: boolean;

  // Lifetime totals
  commits: Metric;
  pullRequests: Metric;
  reviews: Metric;
  issues: Metric;
  followers: Metric;

  // Derived from OWN (non-fork) repositories only
  ownRepositories: Metric;
  starsReceived: Metric;
  forksReceived: Metric;
  /** Own repositories that received at least one star. */
  starredRepositories: Metric;
  languages: LanguageUsage[];
  languagesCoverage: DataCoverage;

  activity: {
    /** Days with at least one contribution, whole account history. */
    activeDays: Metric;
    longestStreakDays: Metric;
    currentStreakDays: Metric;
    /** Active days inside the recent window (RECENT_WINDOW_DAYS). */
    recentActiveDays: Metric;
    /** Contributions per month, chronological, from the creation month to the reference month. */
    monthlyContributions: number[];
    monthlyCoverage: DataCoverage;
  };
}

// ---------------------------------------------------------------------------
// Output: RPGCharacter
// ---------------------------------------------------------------------------

export type ClassName =
  | "Mago"
  | "Alquimista"
  | "Guerreiro"
  | "Patrulheiro"
  | "Paladino"
  | "Bardo"
  | "Ladino"
  | "Oráculo"
  | "Escriba"
  | "Sentinela"
  | "Tecelão"
  | "Aventureiro";

export type Rarity = "common" | "rare" | "epic" | "legendary";

/** Which counter a threshold-based goal (achievement / title) reads. */
export type MetricUnit =
  | "commits"
  | "pullRequests"
  | "reviews"
  | "issues"
  | "repositories"
  | "stars"
  | "languages"
  | "years";

export interface LevelProgress {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpRemaining: number;
  progressPercent: number;
}

export interface RPGProgression extends LevelProgress {
  tier: string;
  /** Level after this one, or null at the maximum level. */
  nextLevel: number | null;
}

export interface RPGStats {
  activity: number;
  experience: number;
  reputation: number;
  versatility: number;
  consistency: number;
}

export interface RPGResources {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
}

export interface RPGArchetype {
  className: ClassName;
  classDescription: string;
  subclassName?: ClassName;
  subclassDescription?: string;
  dominantLanguage?: string;
  subclassLanguage?: string;
}

export type SkillTier =
  | "Aprendiz"
  | "Adepto"
  | "Especialista"
  | "Mestre"
  | "Arquimestre"
  | "Lendário";

/** Language affinity inside GitHub RPG. NOT a measure of professional mastery. */
export interface Skill {
  id: string;
  name: string;
  /** 1-20 */
  level: number;
  tier: SkillTier;
  /** Share of the language in own repositories, 0-100 (1 decimal). */
  sharePercent: number;
  repoCount: number;
}

/**
 * Progress towards a numeric goal.
 * - full coverage: current/progressPercent/remaining are exact;
 * - partial coverage: `current` is a lower bound; while locked, progressPercent and
 *   remaining are null (we cannot say how much is missing);
 * - unavailable: everything null, never unlocked.
 */
export interface ThresholdProgress {
  unit: MetricUnit;
  target: number;
  current: number | null;
  unlocked: boolean;
  progressPercent: number | null;
  remaining: number | null;
  coverage: DataCoverage;
}

export type AchievementCategory =
  | "age"
  | "repositories"
  | "commits"
  | "pullRequests"
  | "reviews"
  | "issues"
  | "stars"
  | "languages";

export interface AchievementProgress extends ThresholdProgress {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: AchievementCategory;
}

export type TitleCategory =
  | "reputation"
  | "activity"
  | "collaboration"
  | "versatility"
  | "longevity"
  | "class";

export interface ThresholdTitleProgress extends ThresholdProgress {
  kind: "threshold";
  id: string;
  name: string;
  description: string;
  category: TitleCategory;
  /** First locked title of its category: the one the UI should show progress for. */
  isNext: boolean;
}

export interface TitleRequirement {
  kind: "class" | "subclass";
  value: ClassName;
  met: boolean;
}

export interface CombinationTitleProgress {
  kind: "combination";
  id: string;
  name: string;
  description: string;
  category: "class";
  unlocked: boolean;
  requirements: TitleRequirement[];
}

export type TitleProgress = ThresholdTitleProgress | CombinationTitleProgress;

export interface RPGSummary {
  commits: Metric;
  ownRepositories: Metric;
  starsReceived: Metric;
  followers: Metric;
  currentStreakDays: Metric;
  accountCreatedAt: string;
  accountAgeYears: number;
}

export interface RPGCharacter {
  identity: {
    username: string;
    displayName?: string;
    bio?: string;
    location?: string;
    company?: string;
  };
  meta: {
    isDemo: boolean;
    referenceDate: string;
  };
  progression: RPGProgression;
  archetype: RPGArchetype;
  stats: RPGStats;
  resources: RPGResources;
  skills: Skill[];
  achievements: AchievementProgress[];
  /** Next goals worth showing, one per category, closest first. Never empty-handed for new profiles. */
  nextMilestones: AchievementProgress[];
  titles: TitleProgress[];
  /** Best unlocked title, used when the user did not pick one. */
  defaultTitleId: string | null;
  summary: RPGSummary;
}
