import { readDataSourceConfig } from "@/data/datasource/config";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { createRPGCharacter } from "@/game/engine";
import type { Metric } from "@/game/types";
import { loadEnvFiles } from "./loadEnv";

/**
 * Optional manual check against the REAL GitHub API. Not part of `npm test` or CI.
 *
 *   npm run github:smoke -- torvalds
 *   npm run github:smoke -- torvalds --rest     (force the per-repository /languages path, to compare request counts)
 *
 * Uses GITHUB_TOKEN from the environment, .env.local or .env when present; without it only
 * the anonymous REST data is fetched. Prints a safe summary: never the token, never headers.
 */

const show = (metric: Metric): string => (metric.coverage === "unavailable" ? "unavailable" : `${metric.value} (${metric.coverage})`);

async function main(): Promise<void> {
  loadEnvFiles();
  const username = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
  if (!username) {
    console.error("Usage: npm run github:smoke -- <username>");
    process.exitCode = 2;
    return;
  }

  const config = readDataSourceConfig({ ...process.env, GITHUB_DATA_SOURCE: "github" });
  const source = new GitHubApiDataSource({
    token: config.githubToken,
    repositoryTransport: process.argv.includes("--rest") ? "rest" : "auto",
  });

  const startedAt = performance.now();
  const raw = await source.getProfile(username);
  const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
  const character = createRPGCharacter(profile);
  const report = source.getReports().at(-1);

  const own = raw.repositories.items.filter((r) => !r.isFork);
  const lines: Array<[string, string]> = [
    ["username", profile.username],
    ["authenticated", source.authenticated ? "yes" : "no (contribution metrics will be unavailable)"],
    ["requests", report ? `${report.totalRequests} (REST ${report.restRequests}, GraphQL ${report.graphqlRequests})` : "?"],
    ["duration", `${Math.round(performance.now() - startedAt)} ms`],
    ["repositories", `${raw.repositories.items.length} listed, ${own.length} own, coverage ${raw.repositories.coverage}`],
    ["commits", show(profile.commits)],
    ["pull requests", show(profile.pullRequests)],
    ["issues", show(profile.issues)],
    ["reviews", show(profile.reviews)],
    ["stars", show(profile.starsReceived)],
    ["forks received", show(profile.forksReceived)],
    ["followers", show(profile.followers)],
    ["active days", show(profile.activity.activeDays)],
    ["longest streak", show(profile.activity.longestStreakDays)],
    ["monthly series", `${profile.activity.monthlyContributions.length} months (${profile.activity.monthlyCoverage})`],
    ["languages", `${profile.languages.length} (${profile.languagesCoverage}): ${profile.languages
      .slice()
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5)
      .map((l) => l.name)
      .join(", ")}`],
    ["character", `level ${character.progression.level} ${character.archetype.className}${character.archetype.subclassName ? ` / ${character.archetype.subclassName}` : ""}`],
    ["top skills", character.skills.slice(0, 5).map((s) => `${s.name} L${s.level} ${s.sharePercent}% (${s.repoCount} repos)`).join(", ")],
    ["stats", Object.entries(character.stats).map(([k, v]) => `${k} ${v}`).join(", ")],
  ];
  for (const [label, value] of lines) console.log(`${label.padEnd(16)} ${value}`);
}

main().catch((error: unknown) => {
  // Typed errors only carry safe messages (no token, no headers).
  console.error(`Failed: ${error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"}`);
  process.exitCode = 1;
});
