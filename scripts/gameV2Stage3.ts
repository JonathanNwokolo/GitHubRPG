import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { loadEnvFiles } from "./loadEnv";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import type { ProfileFetchReport } from "@/data/github/stats";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { collectGitHubEvidenceV2, createRPGCharacterV2, normalizeRepositoryEvidence } from "@/game-v2";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "@/game-v2";

type Cohort = "calibration" | "holdout";
interface BenchmarkProfile { username: string; cohort: Cohort; categories: string[]; mandatory: boolean }

export const BENCHMARK_PROFILES: readonly BenchmarkProfile[] = [
  { username: "JonathanNwokolo", cohort: "calibration", categories: ["frontend-ui", "small"], mandatory: true },
  { username: "torvalds", cohort: "calibration", categories: ["low-level", "long-lived", "huge"], mandatory: true },
  { username: "ahejlsberg", cohort: "calibration", categories: ["tooling", "long-lived"], mandatory: true },
  { username: "yyx990803", cohort: "calibration", categories: ["frontend-ui", "tooling"], mandatory: true },
  { username: "sindresorhus", cohort: "calibration", categories: ["tooling", "huge", "polyglot"], mandatory: true },
  { username: "kentcdodds", cohort: "calibration", categories: ["frontend-ui", "testing-review"], mandatory: true },
  { username: "dhh", cohort: "calibration", categories: ["backend", "long-lived"], mandatory: true },
  { username: "gvanrossum", cohort: "calibration", categories: ["backend", "long-lived"], mandatory: true },
  { username: "matz", cohort: "calibration", categories: ["backend", "low-level", "long-lived"], mandatory: true },
  { username: "antirez", cohort: "calibration", categories: ["low-level", "backend"], mandatory: true },
  { username: "gaearon", cohort: "calibration", categories: ["frontend-ui", "testing-review"], mandatory: true },
  { username: "addyosmani", cohort: "calibration", categories: ["frontend-ui", "tooling", "huge"], mandatory: true },
  { username: "sebmarkbage", cohort: "calibration", categories: ["frontend-ui", "tooling"], mandatory: true },
  { username: "mdo", cohort: "calibration", categories: ["frontend-ui", "design-systems"], mandatory: true },
  { username: "necolas", cohort: "calibration", categories: ["frontend-ui", "mobile"], mandatory: true },
  { username: "mhevery", cohort: "calibration", categories: ["frontend-ui", "tooling"], mandatory: true },
  { username: "segunadebayo", cohort: "calibration", categories: ["frontend-ui", "design-systems"], mandatory: true },
  { username: "emilkowalski", cohort: "calibration", categories: ["frontend-ui", "small"], mandatory: true },
  { username: "iamkun", cohort: "calibration", categories: ["frontend-ui", "tooling"], mandatory: true },
  { username: "pacocoursey", cohort: "calibration", categories: ["frontend-ui", "tooling", "small"], mandatory: true },
  { username: "tiangolo", cohort: "calibration", categories: ["backend", "python"], mandatory: false },
  { username: "TaylorOtwell", cohort: "calibration", categories: ["backend", "php"], mandatory: false },
  { username: "mitsuhiko", cohort: "calibration", categories: ["backend", "python", "polyglot"], mandatory: false },
  { username: "jesseduffield", cohort: "calibration", categories: ["tooling", "go"], mandatory: false },
  { username: "sharkdp", cohort: "calibration", categories: ["tooling", "low-level", "rust"], mandatory: false },
  { username: "mitchellh", cohort: "calibration", categories: ["devops-automation", "tooling"], mandatory: false },
  { username: "kelseyhightower", cohort: "calibration", categories: ["devops-automation", "go"], mandatory: false },
  { username: "EvanBacon", cohort: "calibration", categories: ["mobile", "expo"], mandatory: false },
  { username: "JakeWharton", cohort: "calibration", categories: ["mobile", "kotlin", "testing-review"], mandatory: false },
  { username: "Rich-Harris", cohort: "calibration", categories: ["frontend-ui", "tooling"], mandatory: false },
  { username: "filipedeschamps", cohort: "holdout", categories: ["frontend-ui", "long-lived"], mandatory: true },
  { username: "diego3g", cohort: "holdout", categories: ["frontend-ui", "backend"], mandatory: true },
  { username: "maykbrito", cohort: "holdout", categories: ["frontend-ui", "education"], mandatory: true },
  { username: "loiane", cohort: "holdout", categories: ["frontend-ui", "backend", "java"], mandatory: true },
  { username: "beatrizmilz", cohort: "holdout", categories: ["polyglot", "data"], mandatory: true },
  { username: "omariosouto", cohort: "holdout", categories: ["frontend-ui", "small"], mandatory: true },
  { username: "swyxio", cohort: "holdout", categories: ["polyglot", "frontend-ui"], mandatory: false },
  { username: "antfu", cohort: "holdout", categories: ["tooling", "frontend-ui", "huge"], mandatory: false },
  { username: "samuelcolvin", cohort: "holdout", categories: ["tooling", "python", "backend"], mandatory: false },
  { username: "ThePrimeagen", cohort: "holdout", categories: ["tooling", "low-level", "polyglot"], mandatory: false },
] as const;

interface StoredInput {
  profile: BenchmarkProfile;
  rawProfile: unknown;
  evidence: TechnologyEvidenceProfile;
  collectedAt: string;
  coldLatencyMs: number;
  warmLatencyMs: number;
  v1Report: ProfileFetchReport | null;
  warmV1Report: ProfileFetchReport | null;
}

interface BenchmarkRow {
  username: string;
  cohort: Cohort;
  categories: string[];
  mandatory: boolean;
  accountAgeYears: number;
  ownRepositories: number;
  languagesCoverage: string;
  manifestCoverage: string;
  reviewsCoverage: string;
  v1: { level: number; class: string; subclass: string | null; attributes: unknown };
  v2: RPGCharacterV2;
  performance: {
    coldLatencyMs: number;
    warmLatencyMs: number;
    restRequests: number;
    graphqlRequests: number;
    manifestRequests: number;
    reposInspected: number;
    cacheHits: number;
    v1RestRequests: number;
    v1GraphqlRequests: number;
  };
  deterministicReplay: boolean;
  observedMetrics: {
    commits: number;
    pullRequests: number;
    reviews: number;
    issues: number;
    starsReceived: number;
    ownRepositories: number;
    activeDays: number;
    relevantLanguages: number;
  };
}

const root = path.resolve("artifacts/game-v2-benchmark");
const inputsDir = path.join(root, "inputs");
const roundArg = process.argv.find((arg) => arg.startsWith("--round="))?.split("=")[1] ?? "r0-baseline";
const collect = process.argv.includes("--collect");

async function saveJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function inputPath(username: string): string { return path.join(inputsDir, `${username.toLowerCase()}.json`); }

async function collectInputs(): Promise<void> {
  loadEnvFiles();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN is required for the 40-profile benchmark collection.");
  const reports = new Map<string, ProfileFetchReport[]>();
  const source = new GitHubApiDataSource({
    token,
    repositoryTransport: "auto",
    timeoutMs: 30_000,
    onReport: (report) => reports.set(report.username, [...(reports.get(report.username) ?? []), report]),
  });
  const evidenceCache = new Map<string, TechnologyEvidenceProfile>();
  for (const entry of BENCHMARK_PROFILES) {
    const file = inputPath(entry.username);
    try {
      await readFile(file, "utf8");
      console.log(`SKIP ${entry.username}: input already collected`);
      continue;
    } catch { /* collect missing input */ }
    const started = performance.now();
    const rawProfile = await source.getProfile(entry.username);
    const profile = normalizeDeveloperProfile(validateRawGitHubData(rawProfile));
    const fingerprint = `${profile.username}:${profile.ownRepositories.value}:${profile.languages.length}`;
    const evidence = await collectGitHubEvidenceV2(entry.username, { token, cache: evidenceCache, referenceDate: profile.referenceDate, sourceFingerprint: fingerprint });
    const coldLatencyMs = Math.round(performance.now() - started);
    const warmStarted = performance.now();
    await source.getProfile(entry.username);
    await collectGitHubEvidenceV2(entry.username, { token, cache: evidenceCache, referenceDate: profile.referenceDate, sourceFingerprint: fingerprint });
    const warmLatencyMs = Math.round(performance.now() - warmStarted);
    const profileReports = reports.get(entry.username.toLowerCase()) ?? [];
    await saveJson(file, {
      profile: entry,
      rawProfile,
      evidence,
      collectedAt: new Date().toISOString(),
      coldLatencyMs,
      warmLatencyMs,
      v1Report: profileReports[0] ?? null,
      warmV1Report: profileReports[1] ?? null,
    } satisfies StoredInput);
    console.log(`COLLECTED ${entry.username}: ${coldLatencyMs}ms, REST ${evidence.requests.rest}, manifests ${evidence.requests.manifestFetches}`);
  }
}

function ageYears(createdAt: string, referenceDate: string): number {
  return Math.max(0, (Date.parse(referenceDate) - Date.parse(createdAt)) / (365.2425 * 86_400_000));
}

async function buildRound(): Promise<void> {
  const rows: BenchmarkRow[] = [];
  for (const entry of BENCHMARK_PROFILES) {
    const stored = JSON.parse(await readFile(inputPath(entry.username), "utf8")) as StoredInput;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const v1 = createRPGCharacter(profile);
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const v2 = createRPGCharacterV2({ profile, evidence });
    const deterministicReplay = JSON.stringify(v2) === JSON.stringify(createRPGCharacterV2({ profile, evidence }));
    rows.push({
      username: entry.username,
      cohort: entry.cohort,
      categories: entry.categories,
      mandatory: entry.mandatory,
      accountAgeYears: Math.round(ageYears(profile.accountCreatedAt, profile.referenceDate) * 10) / 10,
      ownRepositories: profile.ownRepositories.value,
      languagesCoverage: profile.languagesCoverage,
      manifestCoverage: stored.evidence.coverage.coverage,
      reviewsCoverage: profile.reviews.coverage,
      v1: { level: v1.progression.level, class: v1.archetype.className, subclass: v1.archetype.subclassName ?? null, attributes: v1.stats },
      v2,
      performance: {
        coldLatencyMs: stored.coldLatencyMs,
        warmLatencyMs: stored.warmLatencyMs,
        restRequests: stored.evidence.requests.rest,
        graphqlRequests: stored.evidence.requests.graphql,
        manifestRequests: stored.evidence.requests.manifestFetches,
        reposInspected: stored.evidence.requests.reposInspected,
        cacheHits: stored.evidence.requests.cacheHits,
        v1RestRequests: stored.v1Report?.restRequests ?? 0,
        v1GraphqlRequests: stored.v1Report?.graphqlRequests ?? 0,
      },
      deterministicReplay,
      observedMetrics: {
        commits: profile.commits.value,
        pullRequests: profile.pullRequests.value,
        reviews: profile.reviews.value,
        issues: profile.issues.value,
        starsReceived: profile.starsReceived.value,
        ownRepositories: profile.ownRepositories.value,
        activeDays: profile.activity.activeDays.value,
        relevantLanguages: analyzeLanguages(profile.languages).relevant.length,
      },
    });
  }
  const output = { generatedAt: new Date().toISOString(), round: roundArg, profiles: rows };
  await saveJson(path.join(root, `benchmark-${roundArg}.json`), output);
  const header = "username,cohort,class,subclass,subclassScore,confidence,evolution,languagesCoverage,manifestCoverage,coldLatencyMs,warmLatencyMs,rest,graphql,manifest,reposInspected";
  const csv = rows.map((row) => [row.username, row.cohort, row.v2.class.value, row.v2.subclass.value ?? "", row.v2.subclass.score ?? "", row.v2.subclass.confidence, row.v2.evolution.value ?? "", row.languagesCoverage, row.manifestCoverage, row.performance.coldLatencyMs, row.performance.warmLatencyMs, row.performance.restRequests, row.performance.graphqlRequests, row.performance.manifestRequests, row.performance.reposInspected].join(","));
  await writeFile(path.join(root, `benchmark-${roundArg}.csv`), `${header}\n${csv.join("\n")}\n`, "utf8");
  console.log(`WROTE ${rows.length} profiles to benchmark-${roundArg}.json/.csv`);
}

async function main(): Promise<void> {
  if (collect) await collectInputs();
  await buildRound();
}

void main();
