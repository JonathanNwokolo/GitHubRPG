import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const REPOSITORY = "JonathanNwokolo/GitHubRPG";
const RELEASE_TAG = "game-v2-artifacts-2026-10-08";
const REFERENCE_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const OUTPUT_DIR = path.resolve(process.argv[2] ?? ".artifact-archive-staging");
const MANIFEST_PATH = path.resolve("artifacts/ARTIFACTS_RAW_MANIFEST.json");

interface BundleDefinition {
  id: string;
  category: string;
  phase: string;
  paths: string[];
}

async function jsonFiles(directory: string): Promise<string[]> {
  return (await readdir(directory))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.posix.join(directory.replaceAll("\\", "/"), name));
}

async function definitions(): Promise<BundleDefinition[]> {
  return [
    {
      id: "benchmark-inputs-v20",
      category: "raw-input",
      phase: "game-v2-stage3",
      paths: await jsonFiles("artifacts/game-v2-benchmark/inputs"),
    },
    {
      id: "benchmark-inputs-v21",
      category: "raw-input",
      phase: "game-v2-stage3b-stage3h",
      paths: await jsonFiles("artifacts/game-v2-benchmark/inputs-v21"),
    },
    {
      id: "benchmark-large-snapshots",
      category: "raw-snapshot",
      phase: "game-v2-stage3-stage3d",
      paths: [
        "artifacts/game-v2-benchmark/benchmark-r0-baseline.json",
        "artifacts/game-v2-benchmark/benchmark-r1-detectors.json",
        "artifacts/game-v2-benchmark/benchmark-r2-balance.json",
        "artifacts/game-v2-benchmark/benchmark-final.json",
        "artifacts/game-v2-benchmark/benchmark-v21-collector.json",
        "artifacts/game-v2-benchmark/benchmark-v22-bounds-baseline.json",
        "artifacts/game-v2-benchmark/benchmark-v22-holdout.json",
      ],
    },
    {
      id: "generalization-inputs-v24",
      category: "raw-input",
      phase: "game-v2-stage3e",
      paths: await jsonFiles("artifacts/game-v2-generalization/inputs-v24"),
    },
    {
      id: "evolution-raw",
      category: "raw-derived-matrix",
      phase: "game-v2-stage3g",
      paths: ["artifacts/game-v2-evolution/e0-baseline.json"],
    },
    {
      id: "null-quality-raw",
      category: "raw-derived-matrix",
      phase: "game-v2-stage3f",
      paths: ["artifacts/game-v2-null-quality/null-quality-all.json"],
    },
  ];
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function versionMetadata(parsed: unknown): { engineVersion: string | null; schemaVersion: string | null } {
  if (!parsed || typeof parsed !== "object") return { engineVersion: null, schemaVersion: null };
  const row = parsed as Record<string, unknown>;
  const nested = [row, row.evidence, row.v2, row.metadata].filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  const find = (keys: string[]) => {
    for (const item of nested) {
      for (const key of keys) if (typeof item[key] === "string") return item[key] as string;
    }
    return null;
  };
  return {
    engineVersion: find(["engineVersion", "collectorVersion", "balanceVersion"]),
    schemaVersion: find(["schemaVersion", "version"]),
  };
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const bundles = [];
  const files = [];

  for (const definition of await definitions()) {
    const archiveName = `${definition.id}.tar.gz`;
    const archivePath = path.join(OUTPUT_DIR, archiveName);
    execFileSync("tar", ["-czf", archivePath, ...definition.paths], { cwd: process.cwd(), stdio: "inherit" });
    const archive = await readFile(archivePath);
    bundles.push({
      id: definition.id,
      fileName: archiveName,
      bytes: archive.byteLength,
      sha256: sha256(archive),
      fileCount: definition.paths.length,
      sourceCommit: REFERENCE_COMMIT,
      downloadUrl: `https://github.com/${REPOSITORY}/releases/download/${RELEASE_TAG}/${archiveName}`,
    });

    for (const relativePath of definition.paths) {
      const data = await readFile(relativePath);
      let versions = { engineVersion: null as string | null, schemaVersion: null as string | null };
      try { versions = versionMetadata(JSON.parse(data.toString("utf8"))); } catch { /* hash remains authoritative */ }
      files.push({
        path: relativePath,
        bytes: (await stat(relativePath)).size,
        sha256: sha256(data),
        category: definition.category,
        phase: definition.phase,
        engineVersion: versions.engineVersion,
        schemaVersion: versions.schemaVersion,
        sourceCommit: REFERENCE_COMMIT,
        bundleId: definition.id,
      });
    }
  }

  if (files.length !== 119) throw new Error(`Expected 119 archived files, found ${files.length}.`);
  await writeFile(MANIFEST_PATH, `${JSON.stringify({
    manifestVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: REPOSITORY,
    releaseTag: RELEASE_TAG,
    sourceCommit: REFERENCE_COMMIT,
    archivedFileCount: files.length,
    archivedBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    bundles,
    files,
  }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputDir: OUTPUT_DIR, manifest: MANIFEST_PATH, bundles: bundles.length, files: files.length }, null, 2));
}

void main();
