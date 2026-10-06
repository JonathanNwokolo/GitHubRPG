import type { RPGCharacter } from "@/game/types";

const FRONTEND_LANGUAGES = new Set(["TypeScript", "JavaScript", "HTML", "CSS", "Vue", "Svelte"]);
const VETERAN_TIERS = new Set(["Veterano", "Mestre", "Elite", "Lendário", "Ascendente"]);

/**
 * Generates a short, deterministic, immersion-focused summary for the Hero Card.
 * Adheres strictly to RPG presentation standards:
 * - Deterministic (no random generation, no external AI)
 * - Pure presentation layer (does not mutate or alter the game engine)
 * - Concise, elegant and respectful (no professional judgment, strictly RPG gamification lore)
 */
export function generateHeroSummary(character: RPGCharacter): string {
  const { archetype, progression, stats, skills, summary } = character;
  const topSkill = skills[0];

  // Fallback for completely empty or level 1 blank profiles
  if (progression.level <= 1 && (!topSkill || skills.length === 0)) {
    return "Aventureiro no início da jornada, pronto para despertar seus poderes no código.";
  }

  // 1. Archetype subject descriptor
  let subject: string;
  switch (archetype.className) {
    case "Mago":
      if (topSkill && FRONTEND_LANGUAGES.has(topSkill.name)) {
        subject = "Mago versado em interfaces";
      } else {
        subject = "Mago dos códigos arcanos";
      }
      break;

    case "Guerreiro":
      if (VETERAN_TIERS.has(progression.tier) || summary.accountAgeYears >= 8) {
        subject = "Guerreiro veterano";
      } else {
        subject = "Guerreiro da linha de frente";
      }
      break;

    case "Alquimista":
      if (stats.versatility >= 45 || skills.length >= 3) {
        subject = "Alquimista de sistemas";
      } else {
        subject = "Alquimista combinador de linguagens";
      }
      break;

    case "Patrulheiro":
      subject = "Patrulheiro explorador de repositórios";
      break;

    case "Paladino":
      subject = "Paladino guardião da comunidade";
      break;

    case "Bardo":
      subject = "Bardo inovador e comunicador";
      break;

    case "Ladino":
      subject = "Ladino ágil em refatorações cirúrgicas";
      break;

    case "Oráculo":
      subject = "Oráculo perspicaz das arquiteturas";
      break;

    case "Escriba":
      subject = "Escriba guardião de documentação e código";
      break;

    case "Sentinela":
      subject = "Sentinela vigilante de sistemas resilientes";
      break;

    case "Tecelão":
      subject = "Tecelão entrelaçando múltiplos ecossistemas";
      break;

    case "Aventureiro":
    default:
      if (VETERAN_TIERS.has(progression.tier)) {
        subject = "Aventureiro veterano dos reinos digitais";
      } else {
        subject = "Aventureiro trilhando novos horizontes";
      }
      break;
  }

  // 2. Trait or affinity predicate
  let predicate: string;
  if (topSkill) {
    if (summary.accountAgeYears >= 8 && stats.experience >= 60) {
      predicate = `moldado por anos de contribuição em ${topSkill.name}`;
    } else if ((stats.versatility >= 45 || skills.length >= 3) && topSkill.sharePercent <= 40) {
      predicate = "com jornada crescente e perfil versátil";
    } else if (topSkill.sharePercent >= 45 || topSkill.level >= 10) {
      predicate = `com forte afinidade em ${topSkill.name}`;
    } else if (stats.activity >= 70) {
      predicate = `com ritmo contínuo e presença ativa em ${topSkill.name}`;
    } else {
      predicate = `com afinidade dedicada em ${topSkill.name}`;
    }
  } else {
    if (stats.versatility >= 60) {
      predicate = "com perfil versátil e jornada multifacetada";
    } else if (stats.reputation >= 60) {
      predicate = "com grande prestígio perante a comunidade";
    } else if (stats.activity >= 60) {
      predicate = "forjado por um ritmo constante de entregas";
    } else {
      predicate = "forjando sua própria lenda no GitHub RPG";
    }
  }

  return `${subject}, ${predicate}.`;
}
