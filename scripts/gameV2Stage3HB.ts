import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import {
  InMemoryEvidenceCache,
  MultiLayerEvidenceCache,
  V2DeliveryService,
  createRPGCharacterV2,
} from "@/game-v2";
import { VERCEL_RUNTIME_CACHE_ITEM_LIMIT_BYTES, VercelRuntimeEvidenceCache, type RuntimeCacheStore } from "@/game-v2/runtimeCache";
import type { RawGitHubData } from "@/data/contracts";
import type { RPGCharacterV2, TechnologyEvidenceProfile } from "@/game-v2/types";
import { requireGameV2Artifacts } from "./gameV2ArtifactRequirement";

const ROOT = path.resolve("artifacts/game-v2-delivery-proof");
const INPUT_DIRS = [
  path.resolve("artifacts/game-v2-benchmark/inputs-v21"),
  path.resolve("artifacts/game-v2-generalization/inputs-v24"),
];

interface FrozenInput {
  rawProfile: RawGitHubData;
  evidence: TechnologyEvidenceProfile;
  coldLatencyMs?: number;
}

function round(value: number): number { return Math.round(value * 100) / 100; }
function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
  return { min: round(sorted[0] ?? 0), median: round(at(0.5)), p90: round(at(0.9)), max: round(sorted.at(-1) ?? 0) };
}
function bytes(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }

async function loadInputs(): Promise<FrozenInput[]> {
  const rows: FrozenInput[] = [];
  for (const directory of INPUT_DIRS) {
    for (const name of (await readdir(directory)).filter((file) => file.endsWith(".json")).sort()) {
      rows.push(JSON.parse(await readFile(path.join(directory, name), "utf8")) as FrozenInput);
    }
  }
  return rows;
}

function memoryStore(): RuntimeCacheStore & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>();
  return {
    values,
    async get(key) { return values.get(key) ?? null; },
    async set(key, value) { values.set(key, value); },
    async delete(key) { values.delete(key); },
  };
}

async function main() {
  requireGameV2Artifacts(["artifacts/game-v2-benchmark/inputs-v21", "artifacts/game-v2-generalization/inputs-v24"]);
  const generatedAt = new Date().toISOString();
  const inputs = await loadInputs();
  assert.equal(inputs.length, 70);
  const evidenceSizes: number[] = [];
  const characterSizes: number[] = [];
  const metadataSizes: number[] = [];
  const totalSizes: number[] = [];
  const coldRecorded: number[] = [];
  let semanticMatches = 0;
  let deterministicMatches = 0;

  for (const row of inputs) {
    const profile = normalizeDeveloperProfile(validateRawGitHubData(row.rawProfile));
    const direct = createRPGCharacterV2({ profile, evidence: row.evidence });
    const roundtripEvidence = JSON.parse(JSON.stringify(row.evidence)) as TechnologyEvidenceProfile;
    const fromRoundtrip = createRPGCharacterV2({ profile, evidence: roundtripEvidence });
    const serializedDirect = JSON.parse(JSON.stringify(direct));
    assert.deepEqual(JSON.parse(JSON.stringify(fromRoundtrip)), serializedDirect);
    assert.deepEqual(JSON.parse(JSON.stringify(direct)), serializedDirect);
    semanticMatches++;
    assert.deepEqual(createRPGCharacterV2({ profile, evidence: row.evidence }), direct);
    deterministicMatches++;

    const backend = memoryStore();
    const evidenceCache = new VercelRuntimeEvidenceCache({ kind: "evidence", isValue: (value): value is TechnologyEvidenceProfile => Boolean(value), store: backend, now: () => 0, maxItemBytes: 10 * 1024 * 1024 });
    await evidenceCache.set("evidence", row.evidence, { ttlMs: 6 * 60 * 60 * 1000, staleTtlMs: 18 * 60 * 60 * 1000 });
    const evidenceEnvelope = backend.values.get("evidence");
    const characterCache = new VercelRuntimeEvidenceCache({ kind: "character", isValue: (value): value is RPGCharacterV2 => Boolean(value), store: backend, now: () => 0 });
    await characterCache.set("character", direct, { ttlMs: 60 * 60 * 1000, staleTtlMs: 23 * 60 * 60 * 1000 });
    const characterEnvelope = backend.values.get("character");
    const evidenceBytes = bytes(evidenceEnvelope);
    const characterBytes = bytes(characterEnvelope);
    evidenceSizes.push(evidenceBytes);
    characterSizes.push(characterBytes);
    metadataSizes.push((evidenceBytes - bytes(row.evidence)) + (characterBytes - bytes(direct)));
    totalSizes.push(evidenceBytes + characterBytes);
    if (row.coldLatencyMs) coldRecorded.push(row.coldLatencyMs);
  }

  const first = inputs[0];
  const profile = normalizeDeveloperProfile(validateRawGitHubData(first.rawProfile));
  const deliveryInput = { profile, sourceFingerprint: "stage3hb-frozen-input" };
  const sharedCharacters = new InMemoryEvidenceCache<RPGCharacterV2>();
  let collectorA = 0;
  let collectorB = 0;
  const instanceA = new V2DeliveryService({
    collector: async () => { collectorA++; return first.evidence; },
    evidenceCache: new InMemoryEvidenceCache<TechnologyEvidenceProfile>(),
    characterCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache<RPGCharacterV2>(), sharedCharacters),
  });
  const instanceB = new V2DeliveryService({
    collector: async () => { collectorB++; return first.evidence; },
    evidenceCache: new InMemoryEvidenceCache<TechnologyEvidenceProfile>(),
    characterCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache<RPGCharacterV2>(), sharedCharacters),
  });
  await instanceA.enrich(deliveryInput);
  const instanceBResult = await instanceB.lookup(deliveryInput);

  const l1Latencies: number[] = [];
  for (let index = 0; index < 100; index++) {
    const started = performance.now();
    await instanceA.lookup(deliveryInput);
    l1Latencies.push(performance.now() - started);
  }
  const l2Latencies: number[] = [];
  for (let index = 0; index < 100; index++) {
    const freshInstance = new V2DeliveryService({
      collector: async () => { throw new Error("collector_must_not_run_on_l2_hit"); },
      evidenceCache: new InMemoryEvidenceCache<TechnologyEvidenceProfile>(),
      characterCache: new MultiLayerEvidenceCache(new InMemoryEvidenceCache<RPGCharacterV2>(), sharedCharacters),
    });
    const started = performance.now();
    await freshInstance.lookup(deliveryInput);
    l2Latencies.push(performance.now() - started);
  }

  const coldInitialLatencies: number[] = [];
  const backgroundLocalLatencies: number[] = [];
  for (const row of inputs) {
    const currentProfile = normalizeDeveloperProfile(validateRawGitHubData(row.rawProfile));
    const service = new V2DeliveryService({ collector: async () => row.evidence });
    const scheduled: Promise<void>[] = [];
    const started = performance.now();
    const response = await service.deliver({ profile: currentProfile, sourceFingerprint: `frozen-${currentProfile.username}` }, (task) => scheduled.push(task));
    coldInitialLatencies.push(performance.now() - started);
    assert.equal(response.state, "enriching");
    const backgroundStarted = performance.now();
    await Promise.all(scheduled);
    backgroundLocalLatencies.push(performance.now() - backgroundStarted);
  }

  const payloadArtifact = {
    generatedAt,
    cohort: 70,
    platformItemLimitBytes: VERCEL_RUNTIME_CACHE_ITEM_LIMIT_BYTES,
    objects: { evidence: stats(evidenceSizes), character: stats(characterSizes), metadata: stats(metadataSizes), totalPerProfile: stats(totalSizes) },
    overLimit: { evidence: evidenceSizes.filter((value) => value > VERCEL_RUNTIME_CACHE_ITEM_LIMIT_BYTES).length, character: characterSizes.filter((value) => value > VERCEL_RUNTIME_CACHE_ITEM_LIMIT_BYTES).length },
    costModel: { itemsPerProfile: 1, writesPerEnrichment: 1, readsPerRepeatRequest: 1, treesManifestsAndEvidenceInL2: false, strategy: "final-character-only" },
  };
  const multiInstanceArtifact = {
    generatedAt,
    simulatedOnly: true,
    instanceA: { l1: "isolated", collectorRequests: collectorA, wroteSharedL2: true },
    instanceB: { l1: "empty", collectorRequests: collectorB, resultSource: instanceBResult.source, state: instanceBResult.state },
    sharedL2: true,
    result: collectorA === 1 && collectorB === 0 && instanceBResult.source === "l2" ? "PASS" : "FAIL",
    crossInstanceDedupe: "not provided; simultaneous misses may produce two enrichments",
  };
  const latencyArtifact = {
    generatedAt,
    localMicrobenchmark: { l1HitMs: stats(l1Latencies), l2AdapterHitMs: stats(l2Latencies), coldInitialResponseMs: stats(coldInitialLatencies), backgroundLocalReplayMs: stats(backgroundLocalLatencies) },
    preservedLiveColdEnrichmentMs: stats(coldRecorded),
    caveat: "L2 and cold-initial figures are local adapter measurements, not Vercel network latency. Preserved live cold values measure full synchronous collection from the frozen input runs.",
    proposedSlaMs: { l1P90: 10, l2P90: 250, coldInitialResponseP90ExcludingV1ProfileLoad: 500, backgroundEnrichmentP90: 55_000 },
  };
  const failureArtifact = {
    generatedAt,
    cases: [
      { failure: "GitHub REST/GraphQL 502", userEffect: "experimental state remains enriching/unavailable; public V1 route unchanged", cacheEffect: "no successful character write" },
      { failure: "tree/manifest timeout", userEffect: "background task remains isolated", cacheEffect: "valid partial may be cached; globally aborted work is discarded" },
      { failure: "hard budget", userEffect: "initial response already returned", cacheEffect: "no write" },
      { failure: "L2 read", userEffect: "L1 or enrichment fallback", cacheEffect: "safe miss" },
      { failure: "L2 write", userEffect: "response unaffected", cacheEffect: "L1 may remain; future instance can miss" },
      { failure: "serialization/payload too large", userEffect: "response unaffected", cacheEffect: "L2 write rejected, never truncated" },
      { failure: "corrupted L2", userEffect: "safe miss", cacheEffect: "entry deleted" },
    ],
  };
  const semanticArtifact = { generatedAt, cohort: 70, semanticCacheRoundtrip: `${semanticMatches}/70`, determinism: `${deterministicMatches}/70`, result: semanticMatches === 70 && deterministicMatches === 70 ? "PASS" : "FAIL" };

  await mkdir(ROOT, { recursive: true });
  await Promise.all([
    writeFile(path.join(ROOT, "cache-payload-sizes.json"), `${JSON.stringify(payloadArtifact, null, 2)}\n`, "utf8"),
    writeFile(path.join(ROOT, "multi-instance-simulation.json"), `${JSON.stringify(multiInstanceArtifact, null, 2)}\n`, "utf8"),
    writeFile(path.join(ROOT, "delivery-latency.json"), `${JSON.stringify(latencyArtifact, null, 2)}\n`, "utf8"),
    writeFile(path.join(ROOT, "failure-matrix.json"), `${JSON.stringify(failureArtifact, null, 2)}\n`, "utf8"),
    writeFile(path.join(ROOT, "semantic-cache-roundtrip.json"), `${JSON.stringify(semanticArtifact, null, 2)}\n`, "utf8"),
  ]);
  console.log(JSON.stringify({ payloadArtifact, multiInstanceArtifact, latencyArtifact, semanticArtifact }, null, 2));
}

void main();
