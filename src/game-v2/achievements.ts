import { calculateAccountAge } from "@/game/age";
import { analyzeLanguages } from "@/game/languages";
import { calculateStats } from "@/game/attributes/calculateAttributes";
import type { DataCoverage, DeveloperProfile, Metric } from "@/game/types";
import { ACHIEVEMENT_CATALOG_V2, type AchievementDefinitionV2 } from "./catalogs";
import type { AchievementV2, FrameworkAffinity, Locale, PublicAchievementV2, SubclassDecision, ToolAffinity } from "./types";

export interface AchievementContext { profile: DeveloperProfile; schools: FrameworkAffinity[]; artifacts: ToolAffinity[]; subclass: SubclassDecision }
interface Result { met: boolean; coverage: DataCoverage; progress: number | null }
const metric = (value: Metric, target: number): Result => ({ met: value.coverage !== "unavailable" && value.value >= target, coverage: value.coverage, progress: value.coverage === "unavailable" ? null : value.value });
const fullOnly = (met: boolean, coverage: DataCoverage, progress: number | null = null): Result => ({ met: coverage === "full" && met, coverage, progress });
const minCoverage = (...coverages: DataCoverage[]): DataCoverage => coverages.includes("unavailable") ? "unavailable" : coverages.includes("partial") ? "partial" : "full";

function evaluate(def: AchievementDefinitionV2, context: AchievementContext): Result {
  const { profile, schools, artifacts, subclass } = context;
  const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
  const analysis = analyzeLanguages(profile.languages);
  const relevant = analysis.relevant;
  const stats = calculateStats(profile, analysis, age);
  const target = def.target ?? 1;
  const techCoverage = schools[0]?.coverage ?? "unavailable";
  const artifactCoverage = artifacts[0]?.coverage ?? "unavailable";
  if (def.id.startsWith("age-")) return { met: age.years >= target, coverage: "full", progress: age.years };
  if (def.id.startsWith("repos-")) return metric(profile.ownRepositories, target);
  if (def.id.startsWith("commits-")) return metric(profile.commits, target);
  if (def.id.startsWith("prs-")) return metric(profile.pullRequests, target);
  if (def.id.startsWith("reviews-")) return metric(profile.reviews, target);
  if (def.id.startsWith("issues-")) return metric(profile.issues, target);
  if (def.id.startsWith("stars-")) return metric(profile.starsReceived, target);
  if (def.id.startsWith("languages-") && def.origin === "v1") return { met: profile.languagesCoverage !== "unavailable" && relevant.length >= target, coverage: profile.languagesCoverage, progress: profile.languagesCoverage === "unavailable" ? null : relevant.length };
  switch (def.id) {
    case "active-days-30": case "active-days-365": return metric(profile.activity.activeDays, target);
    case "streak-30": return metric(profile.activity.longestStreakDays, 30);
    case "consistent-years-5": { const yearly = profile.activity.yearly; return yearly ? { met: yearly.years.filter((year) => year.contributions >= 100).length >= 5, coverage: yearly.coverage, progress: yearly.years.filter((year) => year.contributions >= 100).length } : { met: false, coverage: "unavailable", progress: null }; }
    case "forks-received-10": return metric(profile.forksReceived, 10);
    case "starred-repos-5": return metric(profile.starredRepositories, 5);
    case "collaboration-triad-25": return { met: profile.pullRequests.value >= 25 && profile.reviews.value >= 25 && profile.issues.value >= 25 && [profile.pullRequests, profile.reviews, profile.issues].every((m) => m.coverage !== "unavailable"), coverage: minCoverage(profile.pullRequests.coverage, profile.reviews.coverage, profile.issues.coverage), progress: null };
    case "languages-balanced-3": return fullOnly(relevant.filter((language) => language.relevantShare >= .15).length >= 3, profile.languagesCoverage, relevant.filter((language) => language.relevantShare >= .15).length);
    case "language-specialist-70": return fullOnly(Boolean(analysis.languages[0] && analysis.languages[0].share >= .85 && analysis.languages[0].repoCount >= 10), profile.languagesCoverage, analysis.languages[0]?.share ? analysis.languages[0].share * 100 : null);
    case "schools-first": return { met: schools.some((item) => item.evidenceRepoCount > 0 && (item.confidence === "medium" || item.confidence === "high")), coverage: techCoverage, progress: schools.filter((item) => item.evidenceRepoCount > 0).length };
    case "schools-3": return { met: schools.filter((item) => (item.score ?? 0) >= 45 && (item.confidence === "medium" || item.confidence === "high")).length >= 3, coverage: techCoverage, progress: schools.filter((item) => (item.score ?? 0) >= 45).length };
    case "school-recurring-5": return { met: schools.some((item) => item.evidenceRepoCount >= 5 && (item.score ?? 0) >= 60), coverage: techCoverage, progress: Math.max(0, ...schools.map((item) => item.evidenceRepoCount)) };
    case "schools-fullstack": return fullOnly(schools.some((item) => ["ui-web", "meta-web"].includes(item.family) && (item.score ?? 0) >= 60) && schools.some((item) => item.family === "backend" && (item.score ?? 0) >= 60), techCoverage);
    case "artifacts-3": return { met: artifacts.filter((item) => item.evidenceRepoCount > 0 && (item.confidence === "medium" || item.confidence === "high")).length >= 3, coverage: artifactCoverage, progress: artifacts.filter((item) => item.evidenceRepoCount > 0).length };
    case "testing-recurring-3": return { met: artifacts.some((item) => item.family === "testing" && item.evidenceRepoCount >= 3), coverage: artifactCoverage, progress: Math.max(0, ...artifacts.filter((item) => item.family === "testing").map((item) => item.evidenceRepoCount)) };
    case "automation-ci-3": return { met: artifacts.some((item) => item.id === "github-actions" && item.evidenceRepoCount >= 3), coverage: artifactCoverage, progress: artifacts.find((item) => item.id === "github-actions")?.evidenceRepoCount ?? 0 };
    case "containers-3": return { met: artifacts.some((item) => item.id === "docker" && item.evidenceRepoCount >= 3), coverage: artifactCoverage, progress: artifacts.find((item) => item.id === "docker")?.evidenceRepoCount ?? 0 };
    case "ecosystems-3": return fullOnly(new Set(schools.filter((item) => (item.score ?? 0) >= 60).map((item) => item.family)).size >= 3, techCoverage);
    case "five-paths": return { met: age.years >= 10 && profile.ownRepositories.value >= 50 && profile.starsReceived.value >= 1000 && profile.pullRequests.value >= 500 && profile.reviews.value >= 500 && relevant.length >= 5, coverage: minCoverage(profile.ownRepositories.coverage, profile.starsReceived.coverage, profile.pullRequests.coverage, profile.reviews.coverage, profile.languagesCoverage), progress: null };
    case "perfect-balance": { const values = Object.values(stats); return fullOnly(age.years >= 3 && profile.ownRepositories.value >= 5 && Math.min(...values) >= 55 && Math.max(...values) - Math.min(...values) <= 10, minCoverage(profile.languagesCoverage, profile.ownRepositories.coverage, profile.activity.monthlyCoverage)); }
    case "living-legend": return { met: age.years >= 10 && profile.ownRepositories.value >= 50 && profile.starsReceived.value >= 100 && profile.pullRequests.value >= 100 && subclass.status === "strong", coverage: minCoverage(profile.ownRepositories.coverage, profile.starsReceived.coverage, profile.pullRequests.coverage, subclass.coverage), progress: null };
    default: return { met: false, coverage: "unavailable", progress: null };
  }
}

export function evaluateAchievementsV2(context: AchievementContext): AchievementV2[] {
  return ACHIEVEMENT_CATALOG_V2.map((def) => {
    const result = evaluate(def, context);
    return { ...def, unlocked: result.met, coverage: result.coverage, progress: result.progress, target: def.target ?? null, evidence: [] };
  });
}

export function presentAchievementV2(achievement: AchievementV2, locale: Locale): PublicAchievementV2 {
  if (achievement.secret && !achievement.unlocked) return { id: achievement.id, rarity: achievement.rarity, unlocked: false, secret: true, name: "???", description: locale === "pt-BR" ? "Conquista desconhecida" : "Unknown achievement" };
  return { id: achievement.id, rarity: achievement.rarity, unlocked: achievement.unlocked, secret: achievement.secret, name: locale === "pt-BR" ? achievement.name.pt : achievement.name.en, description: locale === "pt-BR" ? achievement.lore.pt : achievement.lore.en, requirement: achievement.requirement, progress: achievement.progress };
}
