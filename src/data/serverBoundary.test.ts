// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Secrets never reach the browser. These checks make the boundary mechanical:
 * the GitHub token is read in one server-only file, and nothing a browser bundle contains can import it.
 */
const ROOT = resolve(__dirname, "..", "..");
const SRC = resolve(ROOT, "src");

function files(dir: string, pattern = /\.(ts|tsx)$/): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return files(full, pattern);
    return pattern.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

const source = files(SRC);
const rel = (file: string) => file.replace(ROOT, "").replace(/\\/g, "/").replace(/^\//, "");
const read = (file: string) => readFileSync(file, "utf8");
const CONFIG = resolve(SRC, "data", "datasource", "config.ts");
/** The public site URL module: the only other file allowed to read process.env, and only public variables. */
const SITE_URL_MODULE = resolve(SRC, "lib", "siteUrl.ts");

/** Client code = files with a "use client" directive, plus every UI folder (they are bundled for the browser). */
const isClientFile = (file: string) =>
  /^\s*(\/\*[\s\S]*?\*\/\s*)?["']use client["']/.test(read(file)) ||
  ["features", "components", "design-system", "stores", "i18n"].some((dir) => file.startsWith(resolve(SRC, dir)));

describe("GitHub token stays on the server", () => {
  it("never uses a NEXT_PUBLIC_ variable for GitHub credentials (src, scripts, env example, next config)", () => {
    const candidates = [...source, ...files(resolve(ROOT, "scripts")), resolve(ROOT, "next.config.mjs")];
    const example = resolve(ROOT, ".env.example");
    if (existsSync(example)) candidates.push(example);
    const offenders = candidates.filter((file) => /NEXT_PUBLIC_[A-Z_]*GITHUB/i.test(read(file))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("GITHUB_TOKEN is mentioned only in the config module", () => {
    const offenders = source.filter((file) => file !== CONFIG && /GITHUB_TOKEN/.test(read(file))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("process.env is read only in the config module (and the public site URL module)", () => {
    const offenders = source
      .filter((file) => file !== CONFIG && file !== SITE_URL_MODULE && /process\.env/.test(read(file)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("the site URL module reads only public, non-secret variables", () => {
    const variables = [...read(SITE_URL_MODULE).matchAll(/process\.env\.(\w+)/g)].map((match) => match[1]);
    expect([...new Set(variables)].sort()).toEqual(["NEXT_PUBLIC_SITE_URL", "NODE_ENV"]);
  });

  it("NEXT_PUBLIC_SITE_URL is the only NEXT_PUBLIC_ variable in the project", () => {
    const candidates = [...source, ...files(resolve(ROOT, "scripts")), resolve(ROOT, "next.config.mjs")];
    const example = resolve(ROOT, ".env.example");
    if (existsSync(example)) candidates.push(example);
    const used = new Set(candidates.flatMap((file) => read(file).match(/NEXT_PUBLIC_[A-Z0-9_]+/g) ?? []));
    expect([...used]).toEqual(["NEXT_PUBLIC_SITE_URL"]);
  });

  it("the token is never logged or serialised into a response", () => {
    const offenders = source.filter((file) => /(console\.\w+|JSON\.stringify|NextResponse\.json)\([^)]*[tT]oken/.test(read(file))).map(rel);
    // httpClient legitimately stringifies the GraphQL body, which contains no token.
    expect(offenders.filter((file) => !file.endsWith("httpClient.ts"))).toEqual([]);
  });

  const SERVER_ONLY_IMPORT =
    /from\s+["'](@\/data\/(datasource|github|loadCharacter|usage|api\/errorResponse)|\.\.?\/[^"']*\b(datasource|github|usage)\b[^"']*)["']/;

  it("no client code imports the server-side data layer", () => {
    const offenders = source.filter(isClientFile).filter((file) => SERVER_ONLY_IMPORT.test(read(file))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("client code reaches character data only through the API client or server-provided props", () => {
    const page = read(resolve(SRC, "app", "[username]", "CharacterPageClient.tsx"));
    const landing = read(resolve(SRC, "features", "landing", "LandingHero.tsx"));
    expect(page).not.toMatch(/@\/data\/(api\/fetchCharacter|datasource|loadCharacter|github)/);
    expect(landing).toMatch(/@\/data\/api\/fetchCharacter/);
    expect(landing).not.toMatch(/@\/data\/(datasource|loadCharacter|github)/);
  });

  it("only server routes/pages build the data source", () => {
    const users = source
      .filter((file) => /createDataSource\s*\(/.test(read(file)))
      .map(rel)
      .filter((file) => !file.startsWith("src/data/"));
    expect(users.sort()).toEqual([
      "src/app/[username]/page.tsx",
      "src/app/api/badge/[username]/route.ts",
      "src/app/api/card/[username]/achievement/[achievementId]/route.tsx",
      "src/app/api/card/[username]/chronicle/[eventId]/route.tsx",
      "src/app/api/card/[username]/route.tsx",
      "src/app/api/characters/[username]/route.ts",
      "src/app/api/experimental/v2/characters/[username]/route.ts",
      "src/app/api/heroes/route.ts",
    ].sort());
  });
});
