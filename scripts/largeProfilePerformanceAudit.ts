import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import type { ProfileFetchReport } from "@/data/github/stats";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { createRepositoryDiscoverySnapshot } from "@/data/sharedDiscovery";
import { createRPGCharacter } from "@/game/engine";
import {
  collectGitHubEvidenceV21,
  createRPGCharacterV2,
  InMemoryEvidenceCache,
  V2DeliveryService,
  type GitTreeSnapshot,
  type RPGCharacterV2,
  type TechnologyEvidenceProfile,
} from "@/game-v2";
import { createCharacterPresentationModel } from "@/game-v2/publicProjection";
import { loadEnvFiles } from "./loadEnv";

const PROFILES = ["antfu", "sindresorhus", "yyx990803", "addyosmani"] as const;
const OUTPUT = path.resolve("artifacts/large-profile-performance/baseline.json");

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stateFor(character: RPGCharacterV2): "READY" | "PARTIAL" | "FAILED" {
  const coverage = character.explanation.subclass.coverage;
  return coverage === "full" ? "READY" : coverage === "partial" ? "PARTIAL" : "FAILED";
}

async function auditProfile(username: string, token: string) {
  const reports: ProfileFetchReport[] = [];
  const source = new GitHubApiDataSource({ token, onReport: (report) => reports.push(report) });
  const treeCache = new Map<string, GitTreeSnapshot>();
  const manifestCache = new Map<string, string>();

  const totalStarted = performance.now();
  const baseStarted = performance.now();
  const raw = validateRawGitHubData(await source.getProfile(username));
  const fetchReport = reports.at(-1);
  const normalizationStarted = performance.now();
  const profile = normalizeDeveloperProfile(raw);
  const baseNormalizationMs = performance.now() - normalizationStarted;
  const v1ScoringStarted = performance.now();
  createRPGCharacter(profile);
  const v1ScoringMs = performance.now() - v1ScoringStarted;
  const discovery = createRepositoryDiscoverySnapshot(raw);
  if (!discovery) throw new Error(`repository_discovery_unavailable:${username}`);
  const baseMs = performance.now() - baseStarted;

  const collectorStarted = performance.now();
  const errors: Array<{ phase: string; name: string }> = [];
  const evidence = await collectGitHubEvidenceV21(username, {
    token,
    repositoryDiscovery: discovery,
    treeCache,
    manifestCache,
    referenceDate: profile.referenceDate,
    sourceFingerprint: `large-profile-audit:cold:${username}`,
    onError: (error, phase) => errors.push({ phase, name: error instanceof Error ? error.name : "UnknownError" }),
  });
  const enrichmentMs = performance.now() - collectorStarted;
  const scoringStarted = performance.now();
  const character = createRPGCharacterV2({ profile, evidence });
  const scoringMs = performance.now() - scoringStarted;
  const projectionStarted = performance.now();
  const projection = createCharacterPresentationModel(true, { state: character.explanation.subclass.coverage === "partial" ? "partial" : "ready", character });
  const projectionMs = performance.now() - projectionStarted;
  const totalMs = performance.now() - totalStarted;

  // Cache-only checks are intentionally performed after the single cold pass.
  const warmStarted = performance.now();
  const warmEvidence = await collectGitHubEvidenceV21(username, {
    token,
    repositoryDiscovery: discovery,
    treeCache,
    manifestCache,
    referenceDate: profile.referenceDate,
    sourceFingerprint: `large-profile-audit:sha-revisit:${username}`,
  });
  const warmMs = performance.now() - warmStarted;
  const warmCharacter = createRPGCharacterV2({ profile, evidence: warmEvidence });

  const characterCache = new InMemoryEvidenceCache<RPGCharacterV2>();
  const evidenceCache = new InMemoryEvidenceCache<TechnologyEvidenceProfile>();
  const cacheService = new V2DeliveryService({
    characterCache,
    evidenceCache,
    collector: async () => evidence,
    projectProtection: undefined,
  });
  const cacheInput = { profile, sourceFingerprint: `large-profile-audit:cache:${username}` };
  const cacheWriteStarted = performance.now();
  await cacheService.enrich(cacheInput);
  const cacheWriteMs = performance.now() - cacheWriteStarted;
  const cacheLookupStarted = performance.now();
  const cacheHit = await cacheService.lookup(cacheInput);
  const cacheLookupMs = performance.now() - cacheLookupStarted;

  const semantic = {
    repositories: evidence.repositories.map((repo) => repo.id),
    coverage: evidence.coverage,
    languages: character.grimoire.affinities,
    schools: character.grimoire.schools,
    artifacts: character.grimoire.artifacts,
    class: character.class,
    subclass: character.subclass,
    evolution: character.evolution,
    achievements: character.achievements,
    titles: character.titles,
    projection,
  };
  const warmSemantic = {
    ...semantic,
    coverage: warmEvidence.coverage,
    languages: warmCharacter.grimoire.affinities,
    schools: warmCharacter.grimoire.schools,
    artifacts: warmCharacter.grimoire.artifacts,
    class: warmCharacter.class,
    subclass: warmCharacter.subclass,
    evolution: warmCharacter.evolution,
    achievements: warmCharacter.achievements,
    titles: warmCharacter.titles,
    projection: createCharacterPresentationModel(true, { state: warmCharacter.explanation.subclass.coverage === "partial" ? "partial" : "ready", character: warmCharacter }),
  };

  return {
    profile: username,
    totalTimeMs: rounded(totalMs),
    baseMs: rounded(baseMs),
    baseNormalizationMs: rounded(baseNormalizationMs),
    v1ScoringMs: rounded(v1ScoringMs),
    repositoryDiscoveryMs: fetchReport?.phases?.repositoriesMs ?? null,
    graphqlRepositoriesMs: fetchReport?.graphqlByPurpose
      ? fetchReport.graphqlByPurpose.repositories.ms
      : null,
    cursorDiscoveryMs: fetchReport?.graphqlByPurpose
      ? fetchReport.graphqlByPurpose.repository_cursors.ms
      : null,
    contributionsMs: fetchReport?.phases?.contributionsMs ?? null,
    enrichmentMs: rounded(enrichmentMs),
    treeMs: evidence.requests.timingsMs?.treeDiscovery ?? null,
    manifestMs: evidence.requests.timingsMs?.manifestFetch ?? null,
    normalizationMs: evidence.requests.timingsMs?.parsing ?? null,
    scoringMs: rounded(scoringMs),
    projectionMs: rounded(projectionMs),
    cacheLookupMs: rounded(cacheLookupMs),
    cacheWriteMs: rounded(cacheWriteMs),
    baseRequests: {
      rest: fetchReport?.restRequests ?? 0,
      graphql: fetchReport?.graphqlRequests ?? 0,
      graphqlRepositories: fetchReport?.graphqlByPurpose?.repositories.requests ?? 0,
      graphqlCursors: fetchReport?.graphqlByPurpose?.repository_cursors.requests ?? 0,
      graphqlContributions: fetchReport?.graphqlByPurpose?.contributions.requests ?? 0,
    },
    enrichmentRequests: evidence.requests,
    repositoriesDiscovered: discovery.repositories.length,
    repositoriesAnalyzed: evidence.coverage.examined,
    manifestsDiscovered: evidence.coverage.manifestsDiscovered ?? 0,
    manifestsFetched: evidence.coverage.manifestsFetched ?? 0,
    cache: {
      source: cacheHit.source,
      l1Hit: cacheHit.source === "l1",
      l2Hit: cacheHit.source === "l2",
      shaCacheHits: (warmEvidence.requests.treeCacheHits ?? 0) + (warmEvidence.requests.manifestCacheHits ?? 0),
      shaCacheMisses: (warmEvidence.requests.treeRequests ?? 0) + (warmEvidence.requests.manifestFetches - (warmEvidence.requests.manifestCacheHits ?? 0)),
      warmMs: rounded(warmMs),
      warmRestRequests: warmEvidence.requests.rest,
      warmGraphqlRequests: warmEvidence.requests.graphql,
    },
    finalState: stateFor(character),
    runtimeTimeout: errors.some((entry) => entry.name.includes("Timeout")),
    rateLimit: errors.some((entry) => entry.name.includes("RateLimit")),
    upstream5xx: errors.some((entry) => entry.name.includes("Unavailable")),
    rateLimitRemaining: evidence.requests.rateLimitRemaining ?? null,
    semanticHash: hash(semantic),
    warmSemanticHash: hash(warmSemantic),
    shaRevisitSemanticallyEquivalent: hash(semantic) === hash(warmSemantic),
  };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN is required for the bounded large-profile audit");

  const profiles = [];
  for (const username of PROFILES) {
    const result = await auditProfile(username, token);
    profiles.push(result);
    console.info(JSON.stringify({ profile: username, totalTimeMs: result.totalTimeMs, finalState: result.finalState, rest: result.baseRequests.rest + result.enrichmentRequests.rest, graphql: result.baseRequests.graphql + result.enrichmentRequests.graphql }));
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    method: "One bounded local cold pass per profile, followed only by same-process cache/SHA revisits.",
    profiles,
  };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.info(`WROTE ${path.relative(process.cwd(), OUTPUT)}`);
}

void main();
