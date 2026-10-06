/** Public surface of the Game Engine. UI and data layers import from here. */
export * from "./types";
export * from "./constants";
export { createRPGCharacter } from "./createCharacter";
export { calculateAccountAge } from "./age";
export { logNormalize } from "./math";
export { calculateLevelProgress, getLevelTier, levelFromXp, xpThresholdForLevel, MAX_XP } from "./progression/level";
export { calculateProgressionScore, calculateTotalXp } from "./progression/xp";
export { calculateStats } from "./attributes/calculateAttributes";
export { determineArchetype, classForLanguage } from "./classes/classMatrix";
export { calculateSkills } from "./skills/calculateSkills";
export { ACHIEVEMENT_DEFINITIONS, evaluateAchievements } from "./achievements/achievementList";
export { evaluateTitles } from "./titles/titleList";
export { calculateResources } from "./resources";
