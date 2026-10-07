import { parseGitHubProfileInput } from "@/lib/profileUrl";

export function parseDuelUsername(value: string): string {
  return parseGitHubProfileInput(value);
}

export function duelPath(heroA: string, heroB: string): string {
  return `/duel/${encodeURIComponent(parseDuelUsername(heroA).toLowerCase())}/vs/${encodeURIComponent(parseDuelUsername(heroB).toLowerCase())}`;
}

