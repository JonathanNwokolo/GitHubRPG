import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

interface BundleRecord {
  id: string;
  fileName: string;
  bytes: number;
  sha256: string;
  fileCount: number;
  downloadUrl: string;
}

interface FileRecord {
  path: string;
  bytes: number;
  sha256: string;
  bundleId: string;
}

interface Manifest {
  archivedFileCount: number;
  bundles: BundleRecord[];
  files: FileRecord[];
}

const args = process.argv.slice(2);
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};
const selectedBundle = valueAfter("--bundle");
const targetRoot = path.resolve(valueAfter("--target") ?? process.env.ARTIFACTS_RAW_DIR ?? process.cwd());
const cacheRoot = path.resolve(process.env.ARTIFACTS_BUNDLE_CACHE ?? path.join(tmpdir(), "githubrpg-artifact-bundles"));
const verifyOnly = args.includes("--verify-only");
const force = args.includes("--force");
const manifestPath = path.resolve("artifacts/ARTIFACTS_RAW_MANIFEST.json");

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeTarget(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");
  if (!normalized.startsWith("artifacts/") || normalized.includes("../") || path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe manifest path: ${relativePath}`);
  }
  const resolved = path.resolve(targetRoot, relativePath);
  if (!resolved.startsWith(`${targetRoot}${path.sep}`)) throw new Error(`Path escapes restore target: ${relativePath}`);
  return resolved;
}

async function ensureBundle(bundle: BundleRecord): Promise<string> {
  await mkdir(cacheRoot, { recursive: true });
  const cached = path.join(cacheRoot, bundle.fileName);
  if (existsSync(cached)) {
    const data = await readFile(cached);
    if (data.byteLength === bundle.bytes && sha256(data) === bundle.sha256) return cached;
    await rm(cached, { force: true });
  }
  if (verifyOnly) throw new Error(`Bundle not available in cache for --verify-only: ${cached}`);
  const response = await fetch(bundle.downloadUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed for ${bundle.id}: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.byteLength !== bundle.bytes || sha256(data) !== bundle.sha256) {
    throw new Error(`Bundle checksum mismatch: ${bundle.id}`);
  }
  await writeFile(cached, data);
  return cached;
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  if (manifest.archivedFileCount !== 119 || manifest.files.length !== 119) throw new Error("Manifest must contain exactly 119 archived files.");
  const bundles = selectedBundle ? manifest.bundles.filter((bundle) => bundle.id === selectedBundle) : manifest.bundles;
  if (!bundles.length) throw new Error(`Unknown bundle: ${selectedBundle}`);
  await mkdir(targetRoot, { recursive: true });

  for (const bundle of bundles) {
    const expected = manifest.files.filter((file) => file.bundleId === bundle.id);
    if (expected.length !== bundle.fileCount) throw new Error(`Manifest count mismatch for ${bundle.id}.`);
    const archivePath = await ensureBundle(bundle);
    const entries = execFileSync("tar", ["-tzf", archivePath], { encoding: "utf8" })
      .split(/\r?\n/).filter(Boolean).map((entry) => entry.replace(/^\.\//, "").replaceAll("\\", "/"));
    const expectedPaths = expected.map((file) => file.path).sort();
    if (JSON.stringify(entries.sort()) !== JSON.stringify(expectedPaths)) throw new Error(`Unexpected archive entries in ${bundle.id}.`);

    for (const file of expected) {
      const destination = safeTarget(file.path);
      if (!force && existsSync(destination)) {
        const current = await readFile(destination);
        if (current.byteLength !== file.bytes || sha256(current) !== file.sha256) {
          throw new Error(`Existing file differs; use --force only after preserving it: ${file.path}`);
        }
      }
    }

    if (!verifyOnly) execFileSync("tar", ["-xzf", archivePath, "-C", targetRoot], { stdio: "inherit" });
    for (const file of expected) {
      const restored = await readFile(safeTarget(file.path));
      if (restored.byteLength !== file.bytes || sha256(restored) !== file.sha256) throw new Error(`Restored checksum mismatch: ${file.path}`);
    }
    console.log(`VERIFIED ${bundle.id}: ${expected.length} files`);
  }
}

void main();
