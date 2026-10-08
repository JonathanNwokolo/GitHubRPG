import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { loadEnvFiles } from "./loadEnv";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import type { ProfileFetchReport } from "@/data/github/stats";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";
import { validateRawGitHubData } from "@/data/schemas";
import { collectGitHubEvidenceV21, createRPGCharacterV2, normalizeRepositoryEvidence, type CollectionCoverage, type GitTreeSnapshot, type RPGCharacterV2, type TechnologyEvidenceProfile } from "@/game-v2";

type Cohort = "calibration" | "holdout";
interface MatrixEntry { username: string; cohort: Cohort; categories: string[]; mandatory: boolean }
interface PreviousBenchmark { profiles: MatrixEntry[] }
interface StoredV21 {
  profile: MatrixEntry;
  rawProfile: unknown;
  evidence: TechnologyEvidenceProfile;
  collectedAt: string;
  coldLatencyMs: number;
  warmCollectorLatencyMs: number;
  scoringLatencyMs: number;
  v1Report: ProfileFetchReport | null;
}
interface BenchmarkProfileV21 {
  username: string; cohort: Cohort; categories: string[]; mandatory: boolean;
  v2: RPGCharacterV2; deterministicReplay: boolean;
  performance: {
    coldLatencyMs: number; warmCollectorLatencyMs: number; scoringLatencyMs: number; engineBenchmarkMs: number;
    restRequests: number; graphqlRequests: number; treeRequests: number; manifestRequests: number; fallbackRequests: number;
    reposInspected: number; manifestsDiscovered: number; manifestsFetched: number; manifestsSkippedByBudget: number; projectsDiscovered: number;
    timingsMs: TechnologyEvidenceProfile["requests"]["timingsMs"]; v1RestRequests: number; v1GraphqlRequests: number;
  };
  coverage: CollectionCoverage;
  diagnostics: { topArchetype: string | null; topScore: number | null; secondScore: number | null; margin: number | null; confidence: string; blockingReason: string };
}

const root = path.resolve("artifacts/game-v2-benchmark");
const inputRoot = path.join(root, "inputs-v21");
const collect = process.argv.includes("--collect");

async function saveJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function matrix(): Promise<MatrixEntry[]> {
  const old = JSON.parse(await readFile(path.join(root, "benchmark-final.json"), "utf8")) as PreviousBenchmark;
  return old.profiles.map(({ username, cohort, categories, mandatory }) => ({ username, cohort, categories, mandatory }));
}

async function collectInputs(entries: MatrixEntry[]): Promise<void> {
  loadEnvFiles();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN is required for the Stage 3B collection benchmark.");
  const reports = new Map<string, ProfileFetchReport[]>();
  const source = new GitHubApiDataSource({ token, repositoryTransport: "auto", timeoutMs: 30_000, onReport: (report) => reports.set(report.username, [...(reports.get(report.username) ?? []), report]) });
  const treeCache = new Map<string, GitTreeSnapshot>();
  const manifestCache = new Map<string, string>();
  for (const entry of entries) {
    const file = path.join(inputRoot, `${entry.username.toLowerCase()}.json`);
    try { await readFile(file, "utf8"); console.log(`SKIP ${entry.username}: V2.1 input already collected`); continue; } catch { /* collect */ }
    const started = performance.now();
    const rawProfile = await source.getProfile(entry.username);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(rawProfile));
    const fingerprint = `${profile.username}:${profile.ownRepositories.value}:${profile.languages.length}`;
    const evidence = await collectGitHubEvidenceV21(entry.username, { token, treeCache, manifestCache, referenceDate: profile.referenceDate, sourceFingerprint: fingerprint });
    const coldLatencyMs = Math.round(performance.now() - started);
    const scoringStarted = performance.now();
    createRPGCharacterV2({ profile, evidence });
    const scoringLatencyMs = Math.round((performance.now() - scoringStarted) * 100) / 100;
    const warmStarted = performance.now();
    await collectGitHubEvidenceV21(entry.username, { token, treeCache, manifestCache, referenceDate: profile.referenceDate, sourceFingerprint: `${fingerprint}:warm` });
    const warmCollectorLatencyMs = Math.round((performance.now() - warmStarted) * 100) / 100;
    const profileReports = reports.get(entry.username.toLowerCase()) ?? [];
    await saveJson(file, { profile: entry, rawProfile, evidence, collectedAt: new Date().toISOString(), coldLatencyMs, warmCollectorLatencyMs, scoringLatencyMs, v1Report: profileReports[0] ?? null } satisfies StoredV21);
    console.log(`COLLECTED ${entry.username}: ${coldLatencyMs}ms REST=${evidence.requests.rest} GQL=${evidence.requests.graphql} full=${evidence.coverage.coverage} manifests=${evidence.coverage.manifestsFetched}/${evidence.coverage.manifestsDiscovered}`);
  }
}

async function build(entries: MatrixEntry[]): Promise<void> {
  const profiles: BenchmarkProfileV21[] = [];
  for (const entry of entries) {
    const stored = JSON.parse(await readFile(path.join(inputRoot, `${entry.username.toLowerCase()}.json`), "utf8")) as StoredV21;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const scoringStarted = performance.now();
    const v2 = createRPGCharacterV2({ profile, evidence });
    const replay = createRPGCharacterV2({ profile, evidence });
    const engineBenchmarkMs = Math.round((performance.now() - scoringStarted) * 100) / 100;
    const ordered = [...v2.archetypes].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.archetype.localeCompare(b.archetype, "en"));
    profiles.push({
      username: entry.username, cohort: entry.cohort, categories: entry.categories, mandatory: entry.mandatory,
      v2, deterministicReplay: JSON.stringify(v2) === JSON.stringify(replay),
      performance: {
        coldLatencyMs: stored.coldLatencyMs, warmCollectorLatencyMs: stored.warmCollectorLatencyMs, scoringLatencyMs: stored.scoringLatencyMs, engineBenchmarkMs,
        restRequests: stored.evidence.requests.rest, graphqlRequests: stored.evidence.requests.graphql,
        treeRequests: stored.evidence.requests.treeRequests ?? 0, manifestRequests: stored.evidence.requests.manifestRequests ?? 0,
        fallbackRequests: stored.evidence.requests.fallbackRequests ?? 0, reposInspected: stored.evidence.requests.reposInspected,
        manifestsDiscovered: stored.evidence.requests.manifestsDiscovered ?? 0, manifestsFetched: stored.evidence.coverage.manifestsFetched ?? 0,
        manifestsSkippedByBudget: stored.evidence.requests.manifestsSkippedByBudget ?? 0, projectsDiscovered: stored.evidence.requests.projectsDiscovered ?? 0,
        timingsMs: stored.evidence.requests.timingsMs, v1RestRequests: stored.v1Report?.restRequests ?? 0, v1GraphqlRequests: stored.v1Report?.graphqlRequests ?? 0,
      },
      coverage: stored.evidence.coverage,
      diagnostics: { topArchetype: ordered[0]?.archetype ?? null, topScore: ordered[0]?.score ?? null, secondScore: ordered[1]?.score ?? null, margin: ordered[0]?.score != null && ordered[1]?.score != null ? Math.round((ordered[0].score - ordered[1].score) * 10) / 10 : null, confidence: ordered[0]?.confidence ?? "unavailable", blockingReason: v2.subclass.reasonCode },
    });
  }
  const values = (pick: (profile: typeof profiles[number]) => number) => profiles.map(pick);
  const distribution = (pick: (profile: typeof profiles[number]) => string) => Object.fromEntries([...new Set(profiles.map(pick))].sort().map((key) => [key, profiles.filter((profile) => pick(profile) === key).length]));
  const holdout = profiles.filter((profile) => profile.cohort === "holdout");
  const analysis = {
    generatedAt: new Date().toISOString(), profiles: profiles.length, calibration: profiles.filter((profile) => profile.cohort === "calibration").length, holdoutCount: holdout.length,
    coverage: distribution((profile) => profile.coverage.coverage),
    subclasses: distribution((profile) => profile.v2.subclass.value ?? "null"), evolutions: distribution((profile) => profile.v2.evolution.value ?? "null"),
    performance: {
      p50: percentile(values((profile) => profile.performance.coldLatencyMs), 0.5), p90: percentile(values((profile) => profile.performance.coldLatencyMs), 0.9), max: Math.max(...values((profile) => profile.performance.coldLatencyMs)),
      restP90: percentile(values((profile) => profile.performance.restRequests), 0.9), treeP90: percentile(values((profile) => profile.performance.treeRequests), 0.9), manifestP90: percentile(values((profile) => profile.performance.manifestRequests), 0.9),
      avgReposInspected: Math.round(values((profile) => profile.performance.reposInspected).reduce((a, b) => a + b, 0) / profiles.length * 10) / 10,
      avgTreeRequests: Math.round(values((profile) => profile.performance.treeRequests).reduce((a, b) => a + b, 0) / profiles.length * 10) / 10,
      avgManifestRequests: Math.round(values((profile) => profile.performance.manifestRequests).reduce((a, b) => a + b, 0) / profiles.length * 10) / 10,
    },
    deterministic: profiles.filter((profile) => profile.deterministicReplay).length,
    holdout: holdout.map((profile) => ({ username: profile.username, class: profile.v2.class.value, subclass: profile.v2.subclass.value, evolution: profile.v2.evolution.value, ...profile.diagnostics })),
    subclassDiagnostics: profiles.map((profile) => ({ username: profile.username, cohort: profile.cohort, ...profile.diagnostics, coverage: profile.coverage.coverage, gap: profile.coverage.gap })),
  };
  await saveJson(path.join(root, "benchmark-v21-collector.json"), { generatedAt: new Date().toISOString(), collector: "2.1", balanceVersion: profiles[0]?.v2.balanceVersion, profiles });
  await saveJson(path.join(root, "analysis-v21-collector.json"), analysis);
  console.log(JSON.stringify(analysis, null, 2));
}

async function main(): Promise<void> {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/benchmark-final.json", "artifacts/game-v2-benchmark/inputs-v21"]);
  const entries = await matrix(); if (collect) await collectInputs(entries); await build(entries);
}
void main();
