import { createHash } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * "Unique profiles summoned" counter, against the in-memory Upstash stand-in started by playwright.config.ts
 * (e2e/support/fakeUpstash.mjs). Other specs open sheets too, so assertions are about specific profile ids,
 * never about the total being an exact number.
 */
const FAKE_REDIS = "http://127.0.0.1:3917/__state";

const profileId = (username: string) => createHash("sha256").update(username.trim().toLowerCase()).digest("hex").slice(0, 32);

async function fakeRedisState(request: APIRequestContext) {
  const response = await request.get(FAKE_REDIS);
  return (await response.json()) as { members: string[]; commands: string[][] };
}

async function summonedIds(request: APIRequestContext) {
  return new Set((await fakeRedisState(request)).members);
}

test.describe("unique profile counter", () => {
  test("a real visit registers the profile once, case-insensitively, as an opaque id", async ({ page, request }) => {
    const alpha = "counter-alpha-dev";
    await page.goto(`/${alpha}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(async () => (await summonedIds(request)).has(profileId(alpha)), { timeout: 10_000 }).toBe(true);

    await page.reload();
    await page.goto("/Counter-Alpha-Dev");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(500);

    const state = await fakeRedisState(request);
    expect(profileId("Counter-Alpha-Dev")).toBe(profileId(alpha));
    expect(state.members.filter((id) => id === profileId(alpha))).toHaveLength(1);
    expect(state.members.every((id) => /^[a-f0-9]{32}$/.test(id))).toBe(true);
    expect(JSON.stringify(state).toLowerCase()).not.toContain("counter-alpha");
    expect(state.commands.flat().some((part) => /^(EXPIRE|PEXPIRE|SETEX)$/i.test(part))).toBe(false);

    const beta = "counter-beta-dev";
    await page.goto(`/${beta}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(async () => (await summonedIds(request)).has(profileId(beta)), { timeout: 10_000 }).toBe(true);
  });

  test("an unknown profile (404) is not registered and the Hall does not register anyone", async ({ page, request }) => {
    const response = await page.goto("/missing-dev");
    expect(response?.status()).toBe(404);

    await page.goto("/");
    await expect(page.getByRole("link", { name: /Ver ficha/i }).first()).toBeVisible();
    await page.waitForTimeout(1_000);

    const ids = await summonedIds(request);
    expect(ids.has(profileId("missing-dev"))).toBe(false);
    for (const hero of ["sindresorhus", "omariosouto", "emilkowalski", "pacocoursey"]) {
      expect(ids.has(profileId(hero)), `${hero} was only listed in the Hall`).toBe(false);
    }
  });

  test("next/link prefetch of /[username] never registers a profile; a real navigation does", async ({ page, request }) => {
    // Default <Link> prefetch is "auto": it sends Next-Router-Prefetch and, because the route has no loading.tsx,
    // the server skips the page. (router.prefetch() and prefetch={true} are FULL prefetches that would render the
    // sheet and look like a navigation: src/data/usage/prefetchPolicy.test.ts forbids them.)
    const prefetched = new Set<string>();
    page.on("request", (req) => {
      if (req.headers()["next-router-prefetch"] === "1") prefetched.add(new URL(req.url()).pathname);
    });

    await page.goto("/");
    const hall = page.getByRole("region", { name: "Salão dos Heróis" });
    const links = hall.getByRole("link", { name: /Ver ficha/i });
    await expect(links).toHaveCount(3);
    await links.last().scrollIntoViewIfNeeded();
    const hrefs = await links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
    await expect.poll(() => hrefs.filter((href) => prefetched.has(href)).length, { timeout: 10_000, message: "next/link prefetched the Hall profiles" }).toBeGreaterThan(0);
    await page.waitForTimeout(1_500);

    const { members, commands } = await fakeRedisState(request);
    const prefetchedHrefs = hrefs.filter((href) => prefetched.has(href));
    for (const href of prefetchedHrefs) {
      const id = profileId(decodeURIComponent(href.slice(1)));
      expect(members, `${href} was prefetched, not visited`).not.toContain(id);
      expect(commands.some(([name, , member]) => name === "SADD" && member === id), `no SADD for ${href}`).toBe(false);
    }

    // The same link, really followed, does register the profile.
    const target = prefetchedHrefs[0];
    await hall.locator(`a[href="${target}"]`).first().click();
    await page.waitForURL(`**${target}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const username = decodeURIComponent(target.slice(1));
    await expect.poll(async () => (await summonedIds(request)).has(profileId(username)), { timeout: 10_000 }).toBe(true);
  });

  test("Home hides the total below 25, shows it from 25, and hides it when unknown", async ({ page }) => {
    const respondWith = async (value: number | null) => {
      await page.unroute("**/api/stats");
      await page.route("**/api/stats", (route) => route.fulfill({ json: { uniqueProfilesInvoked: value } }));
    };
    const line = (text: RegExp) => page.getByText(text);

    await respondWith(24);
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Duelar dois perfis/ })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(line(/fichas únicas invocadas/)).toHaveCount(0);
    const hiddenHeight = (await page.locator("#home").boundingBox())?.height;

    await respondWith(null);
    await page.reload();
    await page.waitForTimeout(500);
    await expect(line(/fichas únicas invocadas/)).toHaveCount(0);

    await respondWith(1284);
    await page.reload();
    await expect(line(/^1\.284 fichas únicas invocadas$/)).toBeVisible();
    const shownHeight = (await page.locator("#home").boundingBox())?.height;
    expect(shownHeight, "no layout shift when the line appears").toBe(hiddenHeight);

  });

  test("/api/stats reports the Set cardinality as one integer, CDN-cacheable", async ({ request }) => {
    const before = (await fakeRedisState(request)).members.length;
    const response = await request.get("/api/stats");
    const after = (await fakeRedisState(request)).members.length;

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("public, s-maxage=300, stale-while-revalidate=600");
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["uniqueProfilesInvoked"]);
    expect(body.uniqueProfilesInvoked).toBeGreaterThanOrEqual(before);
    expect(body.uniqueProfilesInvoked).toBeLessThanOrEqual(after);
  });
});
