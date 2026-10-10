import type {
  AchievementProgress,
  ClassName,
  SkillTier,
  TitleProgress,
} from "@/game/types";
import type { SupportedLanguage } from "./index";

/**
 * Presentation-only localization for canonical V1 game values.
 * The engine keeps its stable Portuguese ids/names; UI code resolves them here.
 */

const CLASS_NAMES: Record<ClassName, string> = {
  Mago: "Mage",
  Alquimista: "Alchemist",
  Guerreiro: "Warrior",
  Patrulheiro: "Ranger",
  Paladino: "Paladin",
  Bardo: "Bard",
  Ladino: "Rogue",
  Oráculo: "Oracle",
  Escriba: "Scribe",
  Sentinela: "Sentinel",
  Tecelão: "Weaver",
  Aventureiro: "Adventurer",
};

const TIER_NAMES: Record<string, string> = {
  Iniciante: "Beginner",
  Aventureiro: "Adventurer",
  Experiente: "Experienced",
  Veterano: "Veteran",
  Mestre: "Master",
  Elite: "Elite",
  Lendário: "Legendary",
  Ascendente: "Ascendant",
};

const SKILL_TIER_NAMES: Record<SkillTier, string> = {
  Aprendiz: "Apprentice",
  Adepto: "Adept",
  Especialista: "Specialist",
  Mestre: "Master",
  Arquimestre: "Archmaster",
  Lendário: "Legendary",
};

const ACHIEVEMENTS: Record<string, { name: string; description: string }> = {
  "age-1": { name: "First Chapter", description: "A GitHub account with 1 year of history." },
  "age-3": { name: "Code Chronicler", description: "A GitHub account with 3 years of history." },
  "age-5": { name: "Ancient Guardian", description: "A GitHub account with 5 years of history." },
  "age-10": { name: "Repository Legend", description: "A GitHub account with 10 years of history." },
  "age-15": { name: "Code Elder", description: "A GitHub account with 15 years of history." },
  "repos-1": { name: "First Repository", description: "Publish your first own repository." },
  "repos-5": { name: "Explorer", description: "Publish 5 own repositories." },
  "repos-25": { name: "Repository Lord", description: "Publish 25 own repositories." },
  "repos-50": { name: "Realm Builder", description: "Publish 50 own repositories." },
  "repos-100": { name: "World Architect", description: "Publish 100 own repositories." },
  "commits-100": { name: "First Strikes", description: "Reach 100 commits." },
  "commits-1000": { name: "Code Ablaze", description: "Reach 1,000 commits." },
  "commits-5000": { name: "Code Storm", description: "Reach 5,000 commits." },
  "commits-10000": { name: "Tireless Forger", description: "Reach 10,000 commits." },
  "prs-1": { name: "First Ally", description: "Open your first pull request." },
  "prs-25": { name: "Open Source Guardian", description: "Open 25 pull requests." },
  "prs-100": { name: "Collaboration Champion", description: "Open 100 pull requests." },
  "prs-500": { name: "Community Hero", description: "Open 500 pull requests." },
  "reviews-10": { name: "Watchful Eye", description: "Take part in 10 code reviews." },
  "reviews-50": { name: "Code Watcher", description: "Take part in 50 code reviews." },
  "reviews-200": { name: "Quality Guardian", description: "Take part in 200 code reviews." },
  "issues-10": { name: "Bug Hunter", description: "Open 10 issues." },
  "issues-50": { name: "Bounty Hunter", description: "Open 50 issues." },
  "issues-200": { name: "Bug Slayer", description: "Open 200 issues." },
  "stars-1": { name: "First Spark", description: "Receive your first star on an own repository." },
  "stars-25": { name: "Growing Light", description: "Receive 25 stars on your repositories." },
  "stars-100": { name: "Constellation", description: "Receive 100 stars on your repositories." },
  "stars-1000": { name: "Beacon of the Realms", description: "Receive 1,000 stars on your repositories." },
  "languages-2": { name: "First Enchantment", description: "Use 2 relevant languages." },
  "languages-5": { name: "Polyglot", description: "Use 5 relevant languages." },
  "languages-8": { name: "Affinity Master", description: "Use 8 relevant languages." },
};

const TITLES: Record<string, { name: string; description: string }> = {
  "title-stars-10": { name: "Spark Bearer", description: "10+ stars received" },
  "title-stars-50": { name: "Star Hunter", description: "50+ stars received" },
  "title-stars-100": { name: "Lord of the Stars", description: "100+ stars received" },
  "title-stars-500": { name: "Herald of Constellations", description: "500+ stars received" },
  "title-stars-1000": { name: "Celestial Legend", description: "1,000+ stars received" },
  "title-commits-500": { name: "Code Forger", description: "500+ commits" },
  "title-commits-1000": { name: "Tireless", description: "1,000+ commits" },
  "title-commits-5000": { name: "Forge Master", description: "5,000+ commits" },
  "title-commits-10000": { name: "Eternal Forger", description: "10,000+ commits" },
  "title-prs-10": { name: "Code Ally", description: "10+ pull requests" },
  "title-prs-50": { name: "Open Source Emissary", description: "50+ pull requests" },
  "title-prs-100": { name: "Community Guardian", description: "100+ pull requests" },
  "title-prs-500": { name: "Champion of the Open Realms", description: "500+ pull requests" },
  "title-languages-3": { name: "Arcane Explorer", description: "3 relevant languages" },
  "title-languages-5": { name: "Polyglot of Runes", description: "5 relevant languages" },
  "title-languages-8": { name: "Affinity Master", description: "8 relevant languages" },
  "title-years-3": { name: "Chronicler", description: "3+ years on GitHub" },
  "title-years-5": { name: "Ancestral Guardian", description: "5+ years on GitHub" },
  "title-years-10": { name: "Repository Legend", description: "10+ years on GitHub" },
  "title-years-15": { name: "Code Elder", description: "15+ years on GitHub" },
  "title-class-mago-alquimista": { name: "Code Arcanist", description: "Mage class + Alchemist subclass" },
  "title-class-mago-guerreiro": { name: "Runic Knight", description: "Mage class + Warrior subclass" },
  "title-class-mago-bardo": { name: "Interface Weaver", description: "Mage class + Bard subclass" },
  "title-class-alquimista-guerreiro": { name: "Arcane Blacksmith", description: "Alchemist class + Warrior subclass" },
  "title-class-paladino-mago": { name: "Arcane Guardian", description: "Paladin class + Mage subclass" },
  "title-class-patrulheiro-alquimista": { name: "Systems Explorer", description: "Ranger class + Alchemist subclass" },
  "title-class-ladino-mago": { name: "Terminal Illusionist", description: "Rogue class + Mage subclass" },
};

export function localizeClassName(value: ClassName | string, language: SupportedLanguage): string {
  return language === "en" ? (CLASS_NAMES[value as ClassName] ?? value) : value;
}

export function localizeClassNamesInText(value: string, language: SupportedLanguage): string {
  if (language !== "en") return value;
  return (Object.entries(CLASS_NAMES) as Array<[ClassName, string]>).reduce(
    (text, [canonical, translated]) => text.replaceAll(canonical, translated),
    value
  );
}

export function localizeProgressionTier(value: string, language: SupportedLanguage): string {
  return language === "en" ? (TIER_NAMES[value] ?? value) : value;
}

export function localizeSkillTier(value: SkillTier, language: SupportedLanguage): string {
  return language === "en" ? SKILL_TIER_NAMES[value] : value;
}

export function localizeAchievement<T extends Pick<AchievementProgress, "id" | "name" | "description">>(
  achievement: T,
  language: SupportedLanguage
): T {
  const translated = language === "en" ? ACHIEVEMENTS[achievement.id] : undefined;
  return translated ? { ...achievement, ...translated } : achievement;
}

export function localizeTitle<T extends Pick<TitleProgress, "id" | "name" | "description">>(
  title: T,
  language: SupportedLanguage
): T {
  const translated = language === "en" ? TITLES[title.id] : undefined;
  return translated ? { ...title, ...translated } : title;
}
