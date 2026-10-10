import { socialCardPath, type CardLanguage } from "@/lib/profileUrl";
import { getTranslation, type SupportedLanguage } from "@/i18n";

/**
 * The words and links around the Hero Social Card: the post text, the LinkedIn share link, the PNG file name and
 * the path of the image. Pure (no React, no network, no clock), so every rule is unit-testable.
 */

export interface SharePostInput {
  language: SupportedLanguage;
  className: string;
  /** null when the level is not publishable: the line is then left out, never filled with a made-up number. */
  level: number | null;
  /** null when the hero has no equipped title: the line is left out. */
  title: string | null;
  /** The public URL of the character sheet. */
  url: string;
}

/** The text offered to paste next to the image. Short, no metric that is unavailable, a handful of hashtags. */
export function buildSharePostText(input: SharePostInput): string {
  const t = getTranslation(input.language).heroShare.post;
  const facts = [
    `${t.className}: ${input.className}`,
    ...(input.level === null ? [] : [`${t.level}: ${input.level}`]),
    ...(input.title ? [`${t.title}: ${input.title}`] : []),
  ];
  return [t.intro, "", ...facts, "", t.outro, input.url, "", t.hashtags].join("\n");
}

/** LinkedIn's official share dialog. It takes the link only: LinkedIn offers no way to attach a local image. */
export function linkedInShareUrl(profileUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
}

/** "github-rpg-JonathanNwokolo.png": the username as written, reduced to characters that are safe in a file name. */
export function socialCardFilename(username: string): string {
  const safe = username.trim().replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `github-rpg-${safe || "hero"}.png`;
}

/** Where the dialog fetches the card: the language and the equipped title travel as closed, validated values. */
export function socialCardImagePath(username: string, language: SupportedLanguage, titleId?: string | null): string {
  const cardLanguage: CardLanguage = language === "en" ? "en" : "pt-BR";
  return socialCardPath(username, cardLanguage, titleId ?? undefined);
}
