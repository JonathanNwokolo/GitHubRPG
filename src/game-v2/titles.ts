import { calculateAccountAge } from "@/game/age";
import { analyzeLanguages } from "@/game/languages";
import { classForLanguage } from "@/game/classes/classMatrix";
import type { ClassName, DeveloperProfile } from "@/game/types";
import { TITLE_CATALOG_V2, type TitleDefinitionV2 } from "./catalogs";
import type { AchievementV2, ClassDecision, FrameworkAffinity, RequirementResult, SubclassDecision, TitleV2, ToolAffinity } from "./types";

export interface TitleContext { profile: DeveloperProfile; classDecision: ClassDecision; subclass: SubclassDecision; schools: FrameworkAffinity[]; artifacts: ToolAffinity[]; achievements: AchievementV2[] }
const result = (id: string, met: boolean | null, coverage: "full" | "partial" | "unavailable" = "full"): RequirementResult => ({ id, met, coverage });

function affinityCombination(profile: DeveloperProfile, main: ClassName, secondary: ClassName): boolean {
  const analysis = analyzeLanguages(profile.languages);
  const mappedMain = classForLanguage(analysis.languages[0]?.name ?? "");
  return mappedMain === main && analysis.languages.some((language) => language.share >= .10 && classForLanguage(language.name) === secondary);
}

function evaluate(def: TitleDefinitionV2, context: TitleContext): RequirementResult[] {
  const { profile, subclass, schools, artifacts } = context;
  const years = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate).years;
  const relevantLanguages = analyzeLanguages(profile.languages).relevant.length;
  const numeric = (prefix: string): RequirementResult[] | null => {
    const match = def.requirement.match(new RegExp(`^${prefix}>=(\\d+)$`)); if (!match) return null;
    const target = Number(match[1]);
    const map = { stars: profile.starsReceived, commits: profile.commits, prs: profile.pullRequests } as const;
    const metric = map[prefix as keyof typeof map]; return [result(def.requirement, metric.coverage === "unavailable" ? null : metric.value >= target, metric.coverage)];
  };
  const threshold = numeric("stars") ?? numeric("commits") ?? numeric("prs"); if (threshold) return threshold;
  if (def.requirement.startsWith("languages>=")) return [result(def.requirement, profile.languagesCoverage === "unavailable" ? null : relevantLanguages >= Number(def.requirement.split(">=")[1]), profile.languagesCoverage)];
  if (def.requirement.startsWith("years>=")) return [result(def.requirement, years >= Number(def.requirement.split(">=")[1]))];
  const combo = def.requirement.match(/^(Mago|Alquimista|Guerreiro|Paladino|Patrulheiro|Ladino)\+(Alquimista|Guerreiro|Bardo|Mago)10$/);
  if (combo) return [result(def.requirement, affinityCombination(profile, combo[1] as ClassName, combo[2] as ClassName), profile.languagesCoverage)];
  if (def.requirement.endsWith("Strong")) return [result(def.requirement, subclass.status === "strong" && def.requirement.toLowerCase().startsWith(subclass.value ?? "__"), subclass.coverage)];
  switch (def.requirement) {
    case "uiSchool70Repos5": return [result(def.requirement, schools.some((item) => item.family === "ui-web" && (item.score ?? 0) >= 70 && item.evidenceRepoCount >= 5), schools[0]?.coverage ?? "unavailable")];
    case "metaSchool70": return [result(def.requirement, schools.some((item) => item.family === "meta-web" && (item.score ?? 0) >= 70), schools[0]?.coverage ?? "unavailable")];
    case "backendSchool70Repos4": return [result(def.requirement, schools.some((item) => item.family === "backend" && (item.score ?? 0) >= 70 && item.evidenceRepoCount >= 4), schools[0]?.coverage ?? "unavailable")];
    case "mobileSchool70": return [result(def.requirement, schools.some((item) => item.family === "mobile" && (item.score ?? 0) >= 70), schools[0]?.coverage ?? "unavailable")];
    case "frontendBackendStrong": return [result(def.requirement, schools.some((item) => ["ui-web", "meta-web"].includes(item.family) && (item.score ?? 0) >= 60) && schools.some((item) => item.family === "backend" && (item.score ?? 0) >= 60), schools[0]?.coverage ?? "unavailable")];
    case "warriorPaladinArtificer70": return [result(def.requirement, ["Guerreiro", "Paladino"].includes(context.classDecision.value) && subclass.value === "artificer" && (subclass.score ?? 0) >= 70, subclass.coverage)];
    case "chronomancer70CiInfra": return [result(def.requirement, subclass.value === "chronomancer" && (subclass.score ?? 0) >= 70 && artifacts.some((item) => item.id === "github-actions" && item.evidenceRepoCount >= 2) && artifacts.some((item) => ["docker", "terraform"].includes(item.id) && item.evidenceRepoCount >= 2), subclass.coverage)];
    case "achievement:living-legend": return [result(def.requirement, context.achievements.some((item) => item.id === "living-legend" && item.unlocked))];
    default: return [result(def.requirement, false, "unavailable")];
  }
}

export function evaluateTitlesV2(context: TitleContext): TitleV2[] { return TITLE_CATALOG_V2.map((def) => { const requirements = evaluate(def, context); return { ...def, requirements, unlocked: requirements.every((item) => item.met === true) }; }); }

const RARITY = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 } as const;
const CATEGORY = ["evolution", "practice", "hybrid", "ecosystem", "impact", "collaboration", "journey", "affinity"];
export function selectDefaultTitleIdV2(titles: readonly TitleV2[]): string | null {
  return [...titles].filter((item) => item.unlocked).sort((a, b) => RARITY[b.rarity] - RARITY[a.rarity] || CATEGORY.indexOf(a.category) - CATEGORY.indexOf(b.category) || a.id.localeCompare(b.id, "en"))[0]?.id ?? null;
}
