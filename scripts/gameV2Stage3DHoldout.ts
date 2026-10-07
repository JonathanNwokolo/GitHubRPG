import { readdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { ARCHETYPE_ORDER, createRPGCharacterV2, normalizeRepositoryEvidence, type PracticeArchetype, type TechnologyEvidenceProfile } from "@/game-v2";

interface StoredV21 {
  profile: { username: string; cohort: "calibration" | "holdout"; categories: string[]; mandatory: boolean };
  rawProfile: unknown;
  evidence: TechnologyEvidenceProfile;
  collectedAt: string;
  coldLatencyMs: number;
  warmCollectorLatencyMs: number;
  scoringLatencyMs: number;
}

const root = path.resolve("artifacts/game-v2-benchmark");
const inputs = path.join(root, "inputs-v21");
const output = path.join(root, "benchmark-v23-holdout.json");
const round = (value: number | null, digits = 2) => value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;

async function main() {
  try { await readFile(output, "utf8"); throw new Error("Final holdout artifact already exists. Refusing to execute the holdout a second time."); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const files = (await readdir(inputs)).filter((file) => file.endsWith(".json")).sort();
  const profiles = [];
  for (const file of files) {
    const stored = JSON.parse(await readFile(path.join(inputs, file), "utf8")) as StoredV21;
    if (stored.profile.cohort !== "holdout") continue;
    const profile = normalizeDeveloperProfile(validateRawGitHubData(stored.rawProfile));
    const evidence = normalizeRepositoryEvidence({ repositories: stored.evidence.repositories, coverage: stored.evidence.coverage, requests: stored.evidence.requests });
    const startedAt = performance.now();
    const v2 = createRPGCharacterV2({ profile, evidence });
    const replay = createRPGCharacterV2({ profile, evidence });
    const engineMs = performance.now() - startedAt;
    const ordered = [...v2.archetypes].sort((a, b) => (b.observedScore ?? -1) - (a.observedScore ?? -1) || ARCHETYPE_ORDER.indexOf(a.archetype) - ARCHETYPE_ORDER.indexOf(b.archetype));
    profiles.push({
      username: stored.profile.username, categories: stored.profile.categories, className: v2.class.value,
      scores: Object.fromEntries(v2.archetypes.map((item) => [item.archetype, round(item.observedScore)])) as Record<PracticeArchetype, number | null>,
      top1: ordered[0].archetype, top2: ordered[1].archetype, observedMargin: round((ordered[0].observedScore ?? 0) - (ordered[1].observedScore ?? 0)),
      lowerBound: round(ordered[0].lowerBound), rivalUpperBound: round(v2.subclass.runnerUpUpperBound), guaranteedMargin: round(v2.subclass.guaranteedMargin), safeWinner: v2.subclass.safeWinner,
      confidence: v2.subclass.confidence, coverage: v2.subclass.coverage, gap: evidence.coverage.gap ?? "none", subclass: v2.subclass.value, reasonCode: v2.subclass.reasonCode,
      evolution: v2.evolution.value, titles: v2.titles.filter((item) => item.unlocked && item.id.startsWith("title-practice-")).map((item) => item.id),
      schools: v2.explanation.schools.filter((item) => item.evidenceRepoCount > 0).map((item) => ({ id: item.id, score: round(item.score), repos: item.evidenceRepoCount })),
      artifacts: v2.explanation.artifacts.filter((item) => item.evidenceRepoCount > 0).map((item) => ({ id: item.id, score: round(item.score), repos: item.evidenceRepoCount })),
      deterministicReplay: JSON.stringify(v2) === JSON.stringify(replay), engineMs: round(engineMs), requestsAdded: 0, requests: evidence.requests,
    });
  }
  if (profiles.length !== 10) throw new Error(`Final holdout requires exactly 10 profiles; found ${profiles.length}.`);
  const artifact = {
    generatedAt: new Date().toISOString(), stage: "3D-FINAL-HOLDOUT", executionCount: 1,
    engineVersion: "2.0-experimental-v23", balanceVersion: "game-engine-v2-balance-v23-r1-signals", calibrationClosedBeforeExecution: true,
    profiles, determinism: `${profiles.filter((profile) => profile.deterministicReplay).length}/${profiles.length}`, requestsAdded: 0,
  };
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output, profiles: profiles.map((profile) => ({ username: profile.username, scores: profile.scores, margin: profile.observedMargin, guaranteedMargin: profile.guaranteedMargin, confidence: profile.confidence, coverage: profile.coverage, gap: profile.gap, subclass: profile.subclass, reasonCode: profile.reasonCode, schools: profile.schools, artifacts: profile.artifacts })), determinism: artifact.determinism }, null, 2));
}

void main();
