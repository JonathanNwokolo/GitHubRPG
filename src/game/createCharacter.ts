import { calculateAccountAge } from "./age";
import { evaluateAchievements, selectNextMilestones } from "./achievements/achievementList";
import { calculateStats } from "./attributes/calculateAttributes";
import { determineArchetype } from "./classes/classMatrix";
import { LEVEL_MAX } from "./constants";
import { analyzeLanguages } from "./languages";
import { buildProgressMetrics } from "./progress";
import { calculateLevelProgress, getLevelTier } from "./progression/level";
import { calculateTotalXp } from "./progression/xp";
import { calculateResources } from "./resources";
import { calculateSkills } from "./skills/calculateSkills";
import { evaluateTitles, selectDefaultTitleId } from "./titles/titleList";
import type { DeveloperProfile, RPGCharacter } from "./types";
import { assessCharacterCalculationCoverage } from "./coverage";

/**
 * Game Engine entry point. Pure and deterministic: the same DeveloperProfile
 * (including its referenceDate) always yields the same RPGCharacter.
 * Each shared aggregation (age, languages, metrics) is computed exactly once.
 * Cost after normalization: O(languages + achievements + titles).
 */
export function createRPGCharacter(profile: DeveloperProfile): RPGCharacter {
  const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
  const languages = analyzeLanguages(profile.languages);
  const metrics = buildProgressMetrics(profile, languages, age);

  const progress = calculateLevelProgress(calculateTotalXp(profile));
  const stats = calculateStats(profile, languages, age);
  const archetype = determineArchetype(languages);
  const achievements = evaluateAchievements(metrics);
  const titles = evaluateTitles(metrics, archetype);

  return {
    identity: {
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      location: profile.location,
      company: profile.company,
    },
    meta: { isDemo: profile.isDemo, referenceDate: profile.referenceDate },
    calculationCoverage: assessCharacterCalculationCoverage(profile),
    progression: {
      ...progress,
      tier: getLevelTier(progress.level),
      nextLevel: progress.level >= LEVEL_MAX ? null : progress.level + 1,
    },
    archetype,
    stats,
    resources: calculateResources(progress.level, stats),
    skills: calculateSkills(languages),
    achievements,
    nextMilestones: selectNextMilestones(achievements),
    titles,
    defaultTitleId: selectDefaultTitleId(titles),
    summary: {
      commits: profile.commits,
      ownRepositories: profile.ownRepositories,
      starsReceived: profile.starsReceived,
      followers: profile.followers,
      currentStreakDays: profile.activity.currentStreakDays,
      accountCreatedAt: profile.accountCreatedAt,
      accountAgeYears: metrics.years.value,
    },
  };
}
