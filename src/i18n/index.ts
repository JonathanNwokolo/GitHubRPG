import { ptBR, TranslationDictionary } from "./dictionaries/ptBR";
import { en } from "./dictionaries/en";

export type SupportedLanguage = "pt-BR" | "en";

export const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  "pt-BR": ptBR,
  en,
};

export function getTranslation(lang: SupportedLanguage): TranslationDictionary {
  return dictionaries[lang] || dictionaries["pt-BR"];
}

export * from "./dictionaries/ptBR";
