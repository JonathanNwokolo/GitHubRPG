import { absoluteUrl, type SiteUrlEnv } from "./siteUrl";
import { parseGitHubUsername } from "@/data/github/username";

/** Accepts either a GitHub username or the canonical public profile URL. */
export function parseGitHubProfileInput(input: unknown): string {
  if (typeof input !== "string") return parseGitHubUsername("");
  const trimmed = input.trim();
  let candidate = trimmed;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== "github.com" && hostname !== "www.github.com") return parseGitHubUsername("");
    const parts = url.pathname.split("/").filter(Boolean);
    candidate = parts.length === 1 ? parts[0] : "";
  } catch {
    // A plain username is the primary input form.
  }

  return parseGitHubUsername(candidate);
}

/**
 * One normalization for every public URL of a profile (canonical, og:url, shared link, card image):
 * trimmed and lower-cased, the same key the landing already navigates with. GitHub logins are
 * case-insensitive, so `/JonathanNwokolo` and `/jonathannwokolo` share one canonical URL.
 */
export function normalizeProfileUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** "/jonathannwokolo" */
export function profilePath(username: string): string {
  return `/${encodeURIComponent(normalizeProfileUsername(username))}`;
}

/** "/api/card/jonathannwokolo" */
export function profileCardPath(username: string): string {
  return `/api/card/${encodeURIComponent(normalizeProfileUsername(username))}`;
}

/** Public URL of the character sheet: what "Share profile" shares. */
export function profileUrl(username: string, env?: SiteUrlEnv): string {
  return absoluteUrl(profilePath(username), env);
}

/** Public URL of the Hero Card image. */
export function profileCardUrl(username: string, env?: SiteUrlEnv): string {
  return absoluteUrl(profileCardPath(username), env);
}

/** "/api/badge/jonathannwokolo": the README badge (SVG). */
export function profileBadgePath(username: string): string {
  return `/api/badge/${encodeURIComponent(normalizeProfileUsername(username))}`;
}

/** Public URL of the README badge. */
export function profileBadgeUrl(username: string, env?: SiteUrlEnv): string {
  return absoluteUrl(profileBadgePath(username), env);
}

/** Interface languages the card routes accept (`?lang=`). A closed set: nothing free-form reaches the image. */
export type CardLanguage = "pt-BR" | "en";

function languageQuery(language: CardLanguage): string {
  return language === "en" ? "?lang=en" : "";
}

/** "/api/card/jonathannwokolo/achievement/age-5": the card of one unlocked achievement. */
export function achievementCardPath(username: string, achievementId: string, language: CardLanguage = "pt-BR"): string {
  return `${profileCardPath(username)}/achievement/${encodeURIComponent(achievementId)}${languageQuery(language)}`;
}

/** "/api/card/jonathannwokolo/chronicle/2025": the card of one Chronicle chapter (identified by its year). */
export function chronicleCardPath(username: string, year: number, language: CardLanguage = "pt-BR"): string {
  return `${profileCardPath(username)}/chronicle/${encodeURIComponent(String(year))}${languageQuery(language)}`;
}
