import { parseGitHubUsername } from "@/data/github/username";

export function parseDuelUsername(value: string): string {
  const trimmed = value.trim();
  let candidate = trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.toLowerCase() !== "github.com" && url.hostname.toLowerCase() !== "www.github.com") {
      return parseGitHubUsername("");
    }
    const parts = url.pathname.split("/").filter(Boolean);
    candidate = parts.length === 1 ? parts[0] : "";
  } catch {
    // A plain username is the primary input form.
  }
  return parseGitHubUsername(candidate);
}

export function duelPath(heroA: string, heroB: string): string {
  return `/duel/${encodeURIComponent(parseDuelUsername(heroA).toLowerCase())}/vs/${encodeURIComponent(parseDuelUsername(heroB).toLowerCase())}`;
}

