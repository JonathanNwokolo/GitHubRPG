import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createRPGCharacterV2, InMemoryEvidenceCache, V2DeliveryService } from "@/game-v2";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import type { DeveloperProfile } from "@/game/types";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "@/game-v2";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";

const ROOT = path.resolve("artifacts/game-v2-performance");
const SOURCE = path.resolve("artifacts/game-v2-benchmark/benchmark-v21-collector.json");
const INPUTS = path.resolve("artifacts/game-v2-benchmark/inputs-v21");
const COHORT = [
  "JonathanNwokolo", "torvalds", "ahejlsberg", "yyx990803", "sindresorhus",
  "kentcdodds", "dhh", "gvanrossum", "antirez", "addyosmani",
  "tiangolo", "mitchellh", "EvanBacon", "Rich-Harris", "samuelcolvin",
] as const;

interface LegacyRow {
  username: string;
  categories: string[];
  performance: {
    coldLatencyMs: number;
    warmCollectorLatencyMs: number;
    scoringLatencyMs: number;
    restRequests: number;
    graphqlRequests: number;
    treeRequests: number;
    manifestRequests: number;
    fallbackRequests: number;
    timingsMs: { repositorySelection: number; treeDiscovery: number; manifestFetch: number; parsing: number };
  };
  coverage: { coverage: string };
}

interface InputArtifact {
  profile: { username: string };
  rawProfile: unknown;
  evidence: TechnologyEvidenceProfile;
}

interface BenchmarkInput {
  profile: DeveloperProfile;
  evidence: TechnologyEvidenceProfile;
}

function percentile(values: readonly number[], value: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)] * 100) / 100;
}

function stats(values: readonly number[]) {
  return {
    mean: Math.round((values.reduce((sum, item) => sum + item, 0) / Math.max(1, values.length)) * 100) / 100,
    p50: percentile(values, 0.5), p75: percentile(values, 0.75), p90: percentile(values, 0.9),
    p95: percentile(values, 0.95), max: Math.max(0, ...values),
  };
}

async function readInput(username: string): Promise<BenchmarkInput> {
  const stored = JSON.parse(await readFile(path.join(INPUTS, `${username.toLowerCase()}.json`), "utf8")) as InputArtifact;
  return { profile: normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile)), evidence: stored.evidence };
}

async function main(): Promise<void> {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/benchmark-v21-collector.json", "artifacts/game-v2-benchmark/inputs-v21"]);
  const source = JSON.parse(await readFile(SOURCE, "utf8")) as { generatedAt: string; profiles: LegacyRow[] };
  const rows = COHORT.map((username) => {
    const row = source.profiles.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (!row) throw new Error(`Missing performance source for ${username}`);
    return row;
  });

  const p0Profiles = rows.map((row) => {
    const p = row.performance;
    const accounted = p.timingsMs.repositorySelection + p.timingsMs.treeDiscovery + p.timingsMs.manifestFetch + p.timingsMs.parsing + p.scoringLatencyMs;
    return {
      username: row.username, categories: row.categories, coverage: row.coverage.coverage,
      coldMs: p.coldLatencyMs, warmMs: p.warmCollectorLatencyMs,
      breakdownMs: {
        profileAndV1Data: Math.max(0, Math.round(p.coldLatencyMs - accounted)),
        repositories: p.timingsMs.repositorySelection,
        trees: p.timingsMs.treeDiscovery,
        manifests: p.timingsMs.manifestFetch,
        parsing: p.timingsMs.parsing,
        scoring: p.scoringLatencyMs,
      },
      requests: { rest: p.restRequests, graphql: p.graphqlRequests, trees: p.treeRequests, manifestBatches: p.manifestRequests, fallback: p.fallbackRequests },
    };
  });
  const stageNames = ["profileAndV1Data", "repositories", "trees", "manifests", "parsing", "scoring"] as const;
  const baseline = {
    generatedAt: new Date().toISOString(), stage: "3H-P0", sourceGeneratedAt: source.generatedAt,
    sourceArtifact: "artifacts/game-v2-benchmark/benchmark-v21-collector.json",
    methodology: "Fixed 15-profile representative subset of the preserved Collector V2.1 live benchmark. Engine-only evolution changes after this source add zero requests and do not alter collector orchestration.",
    profiles: p0Profiles,
    cold: stats(p0Profiles.map((row) => row.coldMs)),
    warm: stats(p0Profiles.map((row) => row.warmMs)),
    breakdown: Object.fromEntries(stageNames.map((stage) => [stage, stats(p0Profiles.map((row) => row.breakdownMs[stage]))])),
    requests: {
      rest: stats(p0Profiles.map((row) => row.requests.rest)), graphql: stats(p0Profiles.map((row) => row.requests.graphql)),
      trees: stats(p0Profiles.map((row) => row.requests.trees)), manifestBatches: stats(p0Profiles.map((row) => row.requests.manifestBatches)),
    },
  };

  const inputs = await Promise.all(COHORT.map(readInput));
  const p1Profiles = [];
  let semanticMatches = 0;
  for (const artifact of inputs) {
    const collector = async (): Promise<TechnologyEvidenceProfile> => artifact.evidence;
    const service = new V2DeliveryService({ collector });
    const sourceFingerprint = `stage3h:${artifact.profile.username}:snapshot`;
    const direct = createRPGCharacterV2({ profile: artifact.profile, evidence: artifact.evidence });
    const coldStarted = performance.now();
    const cold = await service.enrich({ profile: artifact.profile, sourceFingerprint });
    const coldLocalMs = performance.now() - coldStarted;
    const warmSamples: number[] = [];
    let cached: RPGCharacterV2 | null = null;
    for (let index = 0; index < 10; index++) {
      const started = performance.now();
      const result = await service.enrich({ profile: artifact.profile, sourceFingerprint });
      warmSamples.push(performance.now() - started);
      cached = result.character;
    }
    const serializationStarted = performance.now();
    JSON.stringify(cached);
    const serializationMs = performance.now() - serializationStarted;
    if (JSON.stringify(direct) === JSON.stringify(cold.character) && JSON.stringify(direct) === JSON.stringify(cached)) semanticMatches++;
    const original = p0Profiles.find((row) => row.username.toLowerCase() === artifact.profile.username.toLowerCase())!;
    p1Profiles.push({
      username: artifact.profile.username,
      coldNetworkMs: original.coldMs,
      coldLocalDeliveryMs: Math.round(coldLocalMs * 100) / 100,
      cachedMs: stats(warmSamples),
      serializationMs: Math.round(serializationMs * 100) / 100,
      semanticMatch: JSON.stringify(direct) === JSON.stringify(cached),
    });
  }

  const repeatArtifact = inputs[0];
  let simulatedCalls = 0;
  const simulatedCollector = async (username: string): Promise<TechnologyEvidenceProfile> => {
    simulatedCalls++;
    return inputs.find((item) => item.profile.username.toLowerCase() === username.toLowerCase())?.evidence ?? repeatArtifact.evidence;
  };
  const sameService = new V2DeliveryService({ collector: simulatedCollector });
  const enrich = (artifact: BenchmarkInput, service = sameService) => service.enrich({ profile: artifact.profile, sourceFingerprint: `stage3h:${artifact.profile.username}:snapshot` });
  await enrich(repeatArtifact); await enrich(repeatArtifact); await enrich(repeatArtifact);
  const scenarioA = { requests: 3, enrichments: simulatedCalls, cacheHits: 3 - simulatedCalls };
  const beforeB = simulatedCalls;
  for (const artifact of inputs.slice(1, 6)) await enrich(artifact);
  const scenarioB = { profiles: 5, enrichments: simulatedCalls - beforeB };
  const hallService = new V2DeliveryService({ collector: simulatedCollector });
  const beforeC = simulatedCalls;
  await Promise.all(inputs.slice(0, 5).map((artifact) => enrich(artifact, hallService)));
  const scenarioC = { profiles: 5, enrichments: simulatedCalls - beforeC, globalConcurrencyNeededInRuntime: true };
  const beforeD = simulatedCalls;
  const hallRepeat = await enrich(inputs[0], hallService);
  const scenarioD = { enrichments: simulatedCalls - beforeD, cache: hallRepeat.cache };
  const secondInstance = new V2DeliveryService({ collector: simulatedCollector });
  const beforeE = simulatedCalls;
  await enrich(inputs[0], secondInstance);
  const scenarioE = { enrichments: simulatedCalls - beforeE, limitation: "L1 is process-local and is not shared between instances" };

  let clock = 0;
  const staleCache = new InMemoryEvidenceCache<RPGCharacterV2>(10, () => clock);
  const staleService = new V2DeliveryService({ characterCache: staleCache, collector: async () => repeatArtifact.evidence, policy: { characterTtlMs: 10, characterStaleTtlMs: 20 } });
  await enrich(repeatArtifact, staleService);
  clock = 11;
  const staleLookup = await staleService.lookup({ profile: repeatArtifact.profile, sourceFingerprint: `stage3h:${repeatArtifact.profile.username}:snapshot` });
  await enrich(repeatArtifact, staleService);

  const p1 = {
    generatedAt: new Date().toISOString(), stage: "3H-P1", optimization: "versioned L1 result/evidence cache plus profile-level single-flight",
    profiles: p1Profiles,
    cold: baseline.cold,
    cached: stats(p1Profiles.flatMap((row) => [row.cachedMs.p50])),
    localDeliveryCold: stats(p1Profiles.map((row) => row.coldLocalDeliveryMs)),
    serialization: stats(p1Profiles.map((row) => row.serializationMs)),
    semanticEquivalence: `${semanticMatches}/${p1Profiles.length}`,
    requests: baseline.requests,
    note: "P1 does not change cold GitHub work; it removes repeat collection after a versioned result hit. Cold network values therefore remain the preserved P0 measurements.",
  };
  const cacheAnalysis = {
    generatedAt: p1.generatedAt,
    currentL1: { scope: "one Node.js process / one warm Vercel instance", bounded: true, maxEntriesDefault: 250, eviction: "LRU by access", persistent: false },
    keys: { evidence: "namespace + engine/schema/detector/catalog/balance + username + source fingerprint + referenceDate", tree: "detector + repo id + tree SHA", manifest: "detector + repo id + path + blob SHA", character: "character + evidence identity" },
    ttlRecommendation: { profile: "15m (existing V1)", repositoryMetadata: "15m-1h", tree: "6h fresh + 18h stale", manifest: "24h or SHA invalidation", normalizedEvidence: "6h fresh + 18h stale", finalCharacter: "1h fresh + 23h stale", notFound: "60s (existing V1)" },
    simulations: { repeatedProfile: scenarioA, differentProfiles: scenarioB, hall: scenarioC, profileAfterHall: scenarioD, twoInstances: scenarioE, staleWhileRevalidate: { lookupState: staleLookup.state, policy: "serve stale only when the caller schedules revalidation with platform-supported background work" } },
    persistenceRequiredBeforeIntegration: "OPTIONAL",
    caveat: "Without shared L2, hit ratio depends on instance affinity and warm lifetime; L1 cannot satisfy a multi-instance SLA by itself.",
  };
  const deliveryAnalysis = {
    generatedAt: p1.generatedAt,
    modes: [
      { mode: "A synchronous", firstLoad: "slow cold", repeatLoad: "fast only on same warm instance", complexity: "low", correctness: "full", cost: "high", recommended: false },
      { mode: "B cache-first", firstLoad: "slow on miss", repeatLoad: "sub-second", complexity: "medium", correctness: "full/stale labeled", cost: "medium", recommended: false },
      { mode: "C V1-first async V2", firstLoad: "V1 unaffected", repeatLoad: "V2 when ready", complexity: "medium-high", correctness: "full", cost: "medium", recommended: false },
      { mode: "D hybrid", firstLoad: "V1 first on unknown cold", repeatLoad: "cached V2", complexity: "medium-high", correctness: "full/stale labeled", cost: "controlled", recommended: true },
    ],
    recommendation: "HYBRID: cached/known profiles serve V2; unknown cold profiles keep V1 available and enrich V2 separately; Hall is cache-first/prewarmed with bounded global concurrency.",
    futureContract: { states: ["ready", "stale", "enriching", "partial", "unavailable"], publicEndpointCreated: false },
    timeBudget: { synchronousLookupMs: 500, coldEnrichmentMs: 20_000, onBudgetExceeded: "return V1 or stale V2 and retry enrichment separately" },
    hall: "Never fan out five cold collectors without a global limiter. Prewarm the editorial set and serve partial completion without blocking V1.",
    profile: "Try versioned cache first; cold miss starts enrichment while V1 remains the response path.",
    badgeShare: "Use V1 or cached V2 only; never put a cold V2 enrichment on image/badge generation.",
    futureVps: "Keep EvidenceCacheAdapter; replace L1 with a PostgreSQL-backed/shared adapter and a durable job runner without changing engine semantics.",
  };

  await mkdir(ROOT, { recursive: true });
  await Promise.all([
    writeFile(path.join(ROOT, "performance-p0-baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`, "utf8"),
    writeFile(path.join(ROOT, "performance-p1.json"), `${JSON.stringify(p1, null, 2)}\n`, "utf8"),
    writeFile(path.join(ROOT, "cache-analysis.json"), `${JSON.stringify(cacheAnalysis, null, 2)}\n`, "utf8"),
    writeFile(path.join(ROOT, "delivery-analysis.json"), `${JSON.stringify(deliveryAnalysis, null, 2)}\n`, "utf8"),
  ]);
  console.log(JSON.stringify({ p0: { cold: baseline.cold, warm: baseline.warm }, p1: { cached: p1.cached, semanticEquivalence: p1.semanticEquivalence }, simulations: cacheAnalysis.simulations }, null, 2));
}

void main();
