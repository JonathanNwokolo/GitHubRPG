import { performance } from "node:perf_hooks";
import { loadEnvFiles } from "./loadEnv";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { createRPGCharacter } from "@/game/createCharacter";
import { collectGitHubEvidenceV2, createRPGCharacterV2 } from "@/game-v2";

async function main(): Promise<void> {
  loadEnvFiles();
  const usernames = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (usernames.length === 0) throw new Error("Usage: npm run game:v2:benchmark -- username [username...] [--rest]");
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  const source = new GitHubApiDataSource({ token, repositoryTransport: process.argv.includes("--rest") ? "rest" : "auto" });
  const rows = [];
  for (const username of usernames) {
    const started = performance.now();
    const raw = validateRawGitHubData(await source.getProfile(username));
    const profile = normalizeDeveloperProfile(raw);
    const v1 = createRPGCharacter(profile);
    const evidence = await collectGitHubEvidenceV2(username, { token, referenceDate: profile.referenceDate, sourceFingerprint: `${profile.username}:${profile.ownRepositories.value}:${profile.languages.length}` });
    const v2 = createRPGCharacterV2({ profile, evidence });
    rows.push({ username, v1Class: v1.archetype.className, v1Subclass: v1.archetype.subclassName ?? "none", v2Class: v2.class.value, v2Subclass: v2.subclass.value ?? "none", evolution: v2.evolution.value ?? "none", schools: v2.grimoire.schools.map((item) => item.name).join(", ") || "none", artifacts: v2.grimoire.artifacts.map((item) => item.name).join(", ") || "none", confidence: v2.subclass.confidence, latencyMs: Math.round(performance.now() - started), requests: v2.requests.rest + v2.requests.graphql, coverage: v2.subclass.coverage });
  }
  console.table(rows);
}

void main();
