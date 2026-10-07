import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RPGCharacterV2 } from "@/game-v2";

interface Row {
  username: string;
  cohort: "calibration" | "holdout";
  categories: string[];
  accountAgeYears: number;
  ownRepositories: number;
  languagesCoverage: string;
  manifestCoverage: string;
  reviewsCoverage: string;
  v2: RPGCharacterV2;
  performance: Record<string, number>;
}

const file = process.argv.find((arg) => arg.endsWith(".json")) ?? "artifacts/game-v2-benchmark/benchmark-r0-baseline.json";
const root = path.dirname(file);
const round = path.basename(file, ".json").replace(/^benchmark-/, "");
const parsed = JSON.parse(await readFile(file, "utf8")) as { profiles: Row[] };
const calibration = parsed.profiles.filter((row) => row.cohort === "calibration");

function counts(values: readonly (string | null)[]): Record<string, number> {
  return Object.fromEntries([...new Set(values.map((value) => value ?? "null"))].sort().map((value) => [value, values.filter((item) => (item ?? "null") === value).length]));
}
function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index); const upper = Math.ceil(index);
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}
function percentiles(values: readonly number[]) { return { mean: Math.round(values.reduce((a, b) => a + b, 0) / values.length), p50: percentile(values, .5), p75: percentile(values, .75), p90: percentile(values, .9), max: Math.max(...values) }; }

const mature = calibration.filter((row) => row.accountAgeYears * 365.2425 >= 90 && row.ownRepositories >= 2);
const achievementCounts = Object.fromEntries(calibration[0].v2.achievements.map((achievement) => [achievement.id, calibration.filter((row) => row.v2.achievements.some((item) => item.id === achievement.id && item.unlocked)).length]));
const titleCounts = Object.fromEntries(calibration[0].v2.titles.map((title) => [title.id, calibration.filter((row) => row.v2.titles.some((item) => item.id === title.id && item.unlocked)).length]));
const evolutionBlockers = counts(calibration.map((row) => row.v2.evolution.reasonCode));
const summary = {
  round,
  sample: { total: parsed.profiles.length, calibration: calibration.length, holdout: parsed.profiles.length - calibration.length, matureCalibration: mature.length },
  calibration: {
    classes: counts(calibration.map((row) => row.v2.class.value)),
    subclasses: counts(calibration.map((row) => row.v2.subclass.value)),
    subclassLeaders: counts(calibration.map((row) => [...row.v2.archetypes].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0]?.archetype ?? null)),
    subclassReasons: counts(calibration.map((row) => row.v2.subclass.reasonCode)),
    evolutions: counts(calibration.map((row) => row.v2.evolution.value)),
    evolutionBlockers,
    confidence: counts(calibration.map((row) => row.v2.subclass.confidence)),
    manifestCoverage: counts(calibration.map((row) => row.manifestCoverage)),
    languageCoverage: counts(calibration.map((row) => row.languagesCoverage)),
    performance: {
      coldLatencyMs: percentiles(calibration.map((row) => row.performance.coldLatencyMs)),
      warmLatencyMs: percentiles(calibration.map((row) => row.performance.warmLatencyMs)),
      restRequests: percentiles(calibration.map((row) => row.performance.restRequests)),
      graphqlRequests: percentiles(calibration.map((row) => row.performance.graphqlRequests)),
      manifestRequests: percentiles(calibration.map((row) => row.performance.manifestRequests)),
      reposInspected: percentiles(calibration.map((row) => row.performance.reposInspected)),
    },
    achievementCounts,
    achievementRarity: Object.fromEntries(["common", "rare", "epic", "legendary", "mythic"].map((rarity) => [rarity, calibration.reduce((sum, row) => sum + row.v2.achievements.filter((item) => item.rarity === rarity && item.unlocked).length, 0)])),
    titleCounts,
    titleRarity: Object.fromEntries(["common", "rare", "epic", "legendary", "mythic"].map((rarity) => [rarity, calibration.reduce((sum, row) => sum + row.v2.titles.filter((item) => item.rarity === rarity && item.unlocked).length, 0)])),
  },
  profiles: calibration.map((row) => ({
    username: row.username,
    class: row.v2.class.value,
    subclass: row.v2.subclass.value,
    leader: [...row.v2.archetypes].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0]?.archetype ?? null,
    score: row.v2.subclass.score === null ? null : Math.round(row.v2.subclass.score * 10) / 10,
    secondScore: [...row.v2.archetypes].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[1]?.score ?? null,
    confidence: row.v2.subclass.confidence,
    coverage: row.v2.subclass.coverage,
    reasonCode: row.v2.subclass.reasonCode,
    evolution: row.v2.evolution.value,
    schools: row.v2.grimoire.schools.map((item) => `${item.name}:${Math.round(item.score ?? 0)}(${item.evidenceRepoCount})`),
    artifacts: row.v2.grimoire.artifacts.map((item) => `${item.name}:${Math.round(item.score ?? 0)}(${item.evidenceRepoCount})`),
    coldLatencyMs: row.performance.coldLatencyMs,
    restRequests: row.performance.restRequests,
  })),
};

await writeFile(path.join(root, `analysis-${round}.json`), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ sample: summary.sample, calibration: { ...summary.calibration, achievementCounts: undefined, titleCounts: undefined }, profiles: summary.profiles }, null, 2));
