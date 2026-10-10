import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function configuredDistDir(environment: Record<string, string | undefined>): string {
  const env = { ...process.env };
  delete env.VERCEL;
  delete env.GITHUBRPG_NEXT_CONTEXT;
  delete env.NEXT_DIST_DIR;
  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) delete env[name];
    else env[name] = value;
  }

  return execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", "import('./next.config.mjs').then(({default:c}) => process.stdout.write(c.distDir))"],
    { cwd: ROOT, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
}

describe("Next output-directory contract", () => {
  it.each([
    ["development", {}, ".next"],
    ["explicit dev", { GITHUBRPG_NEXT_CONTEXT: "dev" }, ".next"],
    ["local build/start", { GITHUBRPG_NEXT_CONTEXT: "local-build" }, ".next-build"],
    ["Playwright", { GITHUBRPG_NEXT_CONTEXT: "e2e" }, ".next-e2e"],
    ["Vercel", { VERCEL: "1", GITHUBRPG_NEXT_CONTEXT: "local-build" }, ".next"],
    ["Vercel with malicious legacy override", { VERCEL: "1", NEXT_DIST_DIR: ".next-build" }, ".next"],
    ["E2E with malicious legacy override", { GITHUBRPG_NEXT_CONTEXT: "e2e", NEXT_DIST_DIR: ".next" }, ".next-e2e"],
    ["local build with malicious legacy override", { GITHUBRPG_NEXT_CONTEXT: "local-build", NEXT_DIST_DIR: ".next" }, ".next-build"],
    ["whitespace-only legacy override", { NEXT_DIST_DIR: "   " }, ".next"],
  ] as const)("selects %s output", (_name, env, expected) => {
    expect(configuredDistDir(env)).toBe(expected);
  });

  it.each(["", "   ", "arbitrary", ".next"])("rejects invalid internal context %j", (context) => {
    expect(() => configuredDistDir({ GITHUBRPG_NEXT_CONTEXT: context })).toThrow(/Unsupported GITHUBRPG_NEXT_CONTEXT/);
  });

  it("routes conventional package scripts through the project-owned contexts", () => {
    const scripts = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts;
    expect(scripts.dev).toBe("node scripts/runNextContext.mjs dev");
    expect(scripts.build).toBe("node scripts/runNextContext.mjs build");
    expect(scripts.start).toBe("node scripts/runNextContext.mjs start");
    expect(scripts["build:e2e"]).toBe("node scripts/runNextContext.mjs e2e-build");
  });
});
