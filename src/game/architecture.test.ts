import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Enforces the architecture rules mechanically:
 * the engine is pure, deterministic and independent of UI, data layer and browser.
 */
const SRC = resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

const ENGINE_FILES = sourceFiles(resolve(SRC, "game"));
const rel = (file: string) => file.replace(SRC, "src");

describe("Game Engine purity", () => {
  it("finds the engine files", () => {
    expect(ENGINE_FILES.length).toBeGreaterThan(10);
  });

  const FORBIDDEN: Array<[string, RegExp]> = [
    ["React", /from\s+["']react/],
    ["Next.js", /from\s+["']next/],
    ["the data layer", /from\s+["'](@\/data|\.\.?\/.*data\/)/],
    ["UI / features", /from\s+["']@\/(features|components|design-system|stores|i18n|app)/],
    ["Math.random", /Math\.random\s*\(/],
    ["the wall clock", /Date\.now\s*\(|new Date\s*\(\s*\)/],
    ["fetch", /\bfetch\s*\(/],
    ["localStorage", /localStorage|sessionStorage/],
    ["the DOM", /\bwindow\.|typeof window|\bdocument\.|\bnavigator\./],
    ["zustand", /from\s+["']zustand/],
  ];

  for (const [label, pattern] of FORBIDDEN) {
    it(`never touches ${label}`, () => {
      const offenders = ENGINE_FILES.filter((file) => pattern.test(readFileSync(file, "utf8"))).map(rel);
      expect(offenders).toEqual([]);
    });
  }

  it("never uses `any`", () => {
    const offenders = ENGINE_FILES.filter((file) => /:\s*any\b|<any>|\bas any\b/.test(readFileSync(file, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });
});

describe("Mocks stay deterministic", () => {
  it("no data-layer file uses Math.random or the wall clock", () => {
    const offenders = sourceFiles(resolve(SRC, "data"))
      .filter((file) => /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(\s*\)/.test(readFileSync(file, "utf8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});

describe("Frontend does not own game rules", () => {
  it("UI code never imports MockDataSource directly", () => {
    const uiRoots = ["app", "features", "components"].map((d) => resolve(SRC, d));
    const offenders = uiRoots
      .flatMap(sourceFiles)
      .filter((file) => /MockDataSource|data\/personas/.test(readFileSync(file, "utf8")))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
