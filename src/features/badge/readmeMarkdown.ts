import { profileBadgeUrl, profileUrl } from "@/lib/profileUrl";
import type { SiteUrlEnv } from "@/lib/siteUrl";

/** The badge as a Markdown image that links to the character sheet: `[![GitHub RPG](badge)](profile)`. */
export function readmeBadgeMarkdown(username: string, env?: SiteUrlEnv): string {
  return `[![GitHub RPG](${profileBadgeUrl(username, env)})](${profileUrl(username, env)})`;
}
