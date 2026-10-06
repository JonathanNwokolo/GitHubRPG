// @vitest-environment node
import { describe, expect, it } from "vitest";
import { TtlCache } from "./cache";
import { createLimiter, mapWithConcurrency } from "./concurrency";
import { InvalidUsernameError } from "./errors";
import { fetchAllPages, hasNextPage } from "./pagination";
import { parseGitHubUsername, usernameKey } from "./username";

describe("parseGitHubUsername", () => {
  it.each(["torvalds", "Torvalds", "a", "a-b", "user-name-1", "x".repeat(39), "123", "A1-b2-C3"])("accepts %s", (name) => {
    expect(parseGitHubUsername(name)).toBe(name);
  });

  it("trims surrounding whitespace and keeps the case", () => {
    expect(parseGitHubUsername("  Torvalds \n")).toBe("Torvalds");
  });

  it.each([
    "",
    "   ",
    "-start",
    "end-",
    "double--hyphen",
    "x".repeat(40),
    "has space",
    "under_score",
    "dot.name",
    "slash/name",
    "../etc/passwd",
    "name?x=1",
    "name#frag",
    "ünïcode",
    "dependabot[bot]",
    "a%2Fb",
  ])("rejects %j", (name) => {
    expect(() => parseGitHubUsername(name)).toThrow(InvalidUsernameError);
  });

  it("rejects non-strings", () => {
    expect(() => parseGitHubUsername(undefined)).toThrow(InvalidUsernameError);
    expect(() => parseGitHubUsername(42)).toThrow(InvalidUsernameError);
  });

  it("keys are case-insensitive", () => {
    expect(usernameKey("Torvalds")).toBe(usernameKey("torvalds"));
  });
});

describe("TtlCache", () => {
  it("expires entries after the TTL", () => {
    let now = 1_000;
    const cache = new TtlCache<string>(100, 10, () => now);
    cache.set("a", "x");
    expect(cache.get("a")).toBe("x");
    now += 99;
    expect(cache.get("a")).toBe("x");
    now += 1;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("evicts the oldest entry beyond maxEntries", () => {
    const cache = new TtlCache<number>(1_000, 2, () => 0);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });
});

describe("concurrency helpers", () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

  it("mapWithConcurrency never exceeds the limit and keeps input order", async () => {
    let active = 0;
    let peak = 0;
    const items = Array.from({ length: 30 }, (_, i) => i);
    const results = await mapWithConcurrency(items, 4, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await tick();
      active--;
      return n * 2;
    });
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
    expect(results).toEqual(items.map((n) => n * 2));
  });

  it("mapWithConcurrency stops starting items after the first failure", async () => {
    const started: number[] = [];
    await expect(
      mapWithConcurrency(Array.from({ length: 50 }, (_, i) => i), 2, async (n) => {
        started.push(n);
        await tick();
        if (n === 3) throw new Error("boom");
        return n;
      })
    ).rejects.toThrow("boom");
    expect(started.length).toBeLessThan(50);
  });

  it("createLimiter bounds in-flight tasks", async () => {
    const limit = createLimiter(3);
    let active = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 20 }, () =>
        limit(async () => {
          active++;
          peak = Math.max(peak, active);
          await tick();
          active--;
        })
      )
    );
    expect(peak).toBe(3);
  });
});

describe("pagination", () => {
  it("hasNextPage trusts the Link header, falls back to a full page", () => {
    expect(hasNextPage('<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=5>; rel="last"', 100, 100)).toBe(true);
    expect(hasNextPage('<https://api.github.com/x?page=1>; rel="prev"', 100, 100)).toBe(false);
    expect(hasNextPage(null, 100, 100)).toBe(true);
    expect(hasNextPage(null, 40, 100)).toBe(false);
  });

  it("fetchAllPages walks every page", async () => {
    const result = await fetchAllPages(async (page) => ({ items: [page], hasNext: page < 3 }), 10);
    expect(result).toEqual({ items: [1, 2, 3], truncated: false, pages: 3 });
  });

  it("fetchAllPages stops at the safety limit and reports truncation", async () => {
    const result = await fetchAllPages(async (page) => ({ items: [page], hasNext: true }), 4);
    expect(result).toEqual({ items: [1, 2, 3, 4], truncated: true, pages: 4 });
  });
});
