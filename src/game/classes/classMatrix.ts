import { LANGUAGE_RULES } from "../constants";
import type { LanguageAnalysis } from "../languages";
import type { ClassName, RPGArchetype } from "../types";

/** Flavor text only. Classes are identity: they never modify power. */
export const CLASS_DESCRIPTIONS: Record<ClassName, string> = {
  Mago: "Manipulador de fluxos assíncronos e interfaces dinâmicas. Domina o éter do JavaScript e do TypeScript.",
  Alquimista: "Destila oceanos de dados em fórmulas e automações. Transmuta ideias em Python.",
  Guerreiro: "Guardião do metal e da memória. Batalha com ponteiros, alocações e ciclos de clock.",
  Patrulheiro: "Desliza por canais e goroutines, conectando serviços através de ermos digitais.",
  Paladino: "Defensor de arquiteturas robustas, convenções estritas e contratos bem tipados.",
  Bardo: "Mestre da harmonia visual. Dá forma e cor ao que antes eram estruturas vazias.",
  Ladino: "Opera nas sombras do terminal, automatizando tarefas em shells e pipelines.",
  Oráculo: "Enxerga elegância onde outros veem sintaxe. Escreve Ruby como quem recita profecias.",
  Escriba: "Guardião dos pergaminhos da web. Registra o mundo em PHP há muitas eras.",
  Sentinela: "Vigia os dispositivos móveis dos reinos com Kotlin e Swift.",
  Tecelão: "Entrelaça interfaces multiplataforma com os fios de Dart.",
  Aventureiro: "Explorador versátil, ainda traçando o próprio caminho pelas linguagens do código.",
};

/** Lower-cased GitHub language name -> class. */
const LANGUAGE_CLASS: Readonly<Record<string, ClassName>> = {
  javascript: "Mago",
  typescript: "Mago",
  python: "Alquimista",
  rust: "Guerreiro",
  c: "Guerreiro",
  "c++": "Guerreiro",
  go: "Patrulheiro",
  java: "Paladino",
  "c#": "Paladino",
  html: "Bardo",
  css: "Bardo",
  shell: "Ladino",
  powershell: "Ladino",
  ruby: "Oráculo",
  php: "Escriba",
  kotlin: "Sentinela",
  swift: "Sentinela",
  dart: "Tecelão",
};

export function classForLanguage(language: string): ClassName {
  return LANGUAGE_CLASS[language.trim().toLowerCase()] ?? "Aventureiro";
}

/**
 * Class = class of the dominant language.
 * Subclass = class of the next relevant language that (a) holds at least 10% of the relevant
 * usage, (b) maps to a real class and (c) differs from the main class
 * (TypeScript + JavaScript is still just Mago).
 */
export function determineArchetype(languages: LanguageAnalysis): RPGArchetype {
  const dominant = languages.languages[0];
  if (!dominant) {
    return { className: "Aventureiro", classDescription: CLASS_DESCRIPTIONS.Aventureiro };
  }

  const className = classForLanguage(dominant.name);
  const archetype: RPGArchetype = {
    className,
    classDescription: CLASS_DESCRIPTIONS[className],
    dominantLanguage: dominant.name,
  };

  for (const candidate of languages.relevant) {
    if (candidate.name === dominant.name) continue;
    if (candidate.relevantShare < LANGUAGE_RULES.subclassShare) break; // sorted: the rest is smaller
    const candidateClass = classForLanguage(candidate.name);
    if (candidateClass === "Aventureiro" || candidateClass === className) continue;
    archetype.subclassName = candidateClass;
    archetype.subclassDescription = CLASS_DESCRIPTIONS[candidateClass];
    archetype.subclassLanguage = candidate.name;
    break;
  }

  return archetype;
}
