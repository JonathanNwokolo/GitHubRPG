// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The "unique profiles summoned" counter trusts that a render of /[username] means a real visit.
 * Next's default <Link> prefetch ("auto") never renders that page (no loading.tsx). A FULL prefetch does, and the server
 * cannot tell it from a navigation: router.prefetch() and <Link prefetch={true}> would count a profile nobody opened.
 */
const SRC = resolve(__dirname, "..", "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

const FULL_PREFETCH = /\.prefetch\s*\(|\sprefetch(?:\s*=\s*\{?\s*true\b|\s*\/?>|\s+[\w-]+=)/;
const withoutComments = (code: string) => code.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");

describe("prefetch policy for profile pages", () => {
  it("no code issues a FULL prefetch (router.prefetch, prefetch={true}, bare prefetch)", () => {
    const offenders = sources(SRC)
      .filter((file) => FULL_PREFETCH.test(withoutComments(readFileSync(file, "utf8"))))
      .map((file) => file.replace(SRC, "src").split("\\").join("/"));
    expect(offenders).toEqual([]);
  });

  it("the detector does catch the forms it exists to forbid", () => {
    for (const code of ["router.prefetch(href)", "<Link href={x} prefetch>", "<Link prefetch={true} href={x}>", "<Link prefetch />", "<Link prefetch href={x}>"]) {
      expect(FULL_PREFETCH.test(code), code).toBe(true);
    }
    for (const code of ["<Link href={x}>", "<Link prefetch={false} href={x}>", "const prefetched = new Set()"]) {
      expect(FULL_PREFETCH.test(code), code).toBe(false);
    }
  });
});
