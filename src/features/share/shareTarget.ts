import { fill } from "@/lib/format";
import { achievementCardPath, chronicleCardPath, profileUrl, type CardLanguage } from "@/lib/profileUrl";
import { getTranslation, type SupportedLanguage } from "@/i18n";

/** What a share card is about. Both kinds are identified by stable ids, never by free text. */
export type ShareTarget =
  | { kind: "achievement"; id: string; name: string }
  | { kind: "chronicle"; year: number; title: string };

/** Lower-case ASCII only: whatever is passed in, the result is safe as part of a file name. */
function safeFilenamePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

/** "github-rpg-{username}-achievement-{id}.png" / "github-rpg-{username}-chronicle-{year}.png" */
export function shareCardFilename(username: string, target: ShareTarget): string {
  const id = target.kind === "achievement" ? target.id : String(target.year);
  return `github-rpg-${safeFilenamePart(username)}-${target.kind}-${safeFilenamePart(id)}.png`;
}

export function shareCardImagePath(username: string, target: ShareTarget, language: CardLanguage): string {
  return target.kind === "achievement"
    ? achievementCardPath(username, target.id, language)
    : chronicleCardPath(username, target.year, language);
}

export interface ShareTexts {
  dialogTitle: string;
  previewLabel: string;
  data: { title: string; text: string; url: string };
}

/**
 * The words around a card, in the interface language.
 * V1 shares the PROFILE link: the sheet has no per-achievement or per-chapter URL, so a deeper link would only
 * land on the generic page. The image (download) is the content that is specific to the achievement or chapter.
 */
export function describeShareTarget(username: string, target: ShareTarget, language: SupportedLanguage): ShareTexts {
  const t = getTranslation(language).shareCard;
  const url = profileUrl(username);

  if (target.kind === "achievement") {
    return {
      dialogTitle: t.achievementTitle,
      previewLabel: fill(t.achievementPreview, { name: target.name }),
      data: {
        title: fill(t.achievementShareTitle, { name: target.name }),
        text: fill(t.achievementShareText, { username, name: target.name }),
        url,
      },
    };
  }
  return {
    dialogTitle: t.chapterTitle,
    previewLabel: fill(t.chapterPreview, { year: target.year }),
    data: {
      title: fill(t.chapterShareTitle, { year: target.year, title: target.title }),
      text: fill(t.chapterShareText, { username, year: target.year, title: target.title }),
      url,
    },
  };
}
