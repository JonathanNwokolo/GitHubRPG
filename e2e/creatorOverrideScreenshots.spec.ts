import { test, expect, type Page } from "@playwright/test";
import { createRPGCharacter } from "@/game/createCharacter";
import { languagesFromShares, makeMaxedProfile, makeProfile, m } from "@/test/builders";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/Home/.gemini/antigravity/brain/6b732dd0-7fd9-46f6-abe1-daac029a2757/screenshots";
const PUBLIC_SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

async function saveScreenshot(page: Page, filename: string, options: { fullPage?: boolean } = {}) {
  const dirs = [SCREENSHOT_DIR, PUBLIC_SCREENSHOT_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const primaryPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: primaryPath, ...options });
  const publicPath = path.join(PUBLIC_SCREENSHOT_DIR, filename);
  fs.copyFileSync(primaryPath, publicPath);
}

test.describe.configure({ mode: "serial" });

test.describe("Creator Override Visual Sequence & Relic Card Screenshots", () => {
  const creatorBase = createRPGCharacter(makeProfile({ username: "JonathanNwokolo" }));
  const creatorCharacter = {
    ...creatorBase,
    stats: { ...creatorBase.stats, reputation: 50 },
    summary: { ...creatorBase.summary, starsReceived: m(100), followers: m(100) },
  };
  const opponentBase = createRPGCharacter({
    ...makeMaxedProfile(),
    username: "gvanrossum",
    languages: languagesFromShares({ TypeScript: 80, Rust: 20 }, 20),
  });
  const opponentCharacter = {
    ...opponentBase,
    stats: { ...opponentBase.stats, reputation: 0 },
    summary: { ...opponentBase.summary, starsReceived: m(0), followers: m(0) },
  };

  const setupMocks = async (page: Page) => {
    await page.route("**/api/characters/*", async (route) => {
      const url = route.request().url().toLowerCase();
      if (url.includes("jonathannwokolo")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(creatorCharacter),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(opponentCharacter),
        });
      }
    });
  };

  const setupNormalDuelMocks = async (page: Page) => {
    await page.route("**/api/characters/*", async (route) => {
      const username = new URL(route.request().url()).pathname.split("/").pop() || "hero";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...opponentCharacter,
          identity: { ...opponentCharacter.identity, username, displayName: username },
        }),
      });
    });
  };

  const expectFullyVisibleBelowHeader = async (page: Page, locator: ReturnType<Page["locator"]>) => {
    const box = await locator.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(64);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  };

  const scrollRegion = async (page: Page) => {
    await page.evaluate(() => {
      const el = document.querySelector('[role="region"]');
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "center" });
      }
    });
    await page.waitForTimeout(150);
  };

  test("captures desktop phases 01 to 03: card entrance, emergence, and flip", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 960 });
    await setupMocks(page);

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    // 1. Wait for summoning circle (after the five paced round cards)
    const summonLocator = page.getByText("INVOCAÇÃO ARCANO DA RAIZ");
    await expect(summonLocator).toBeVisible({ timeout: 45_000 });
    await scrollRegion(page);

    // 01: Card Entrance - Back face rising from circle (t = 11500ms)
    await page.waitForTimeout(1000);
    await scrollRegion(page);
    await saveScreenshot(page, "01-card-back-desktop.png");

    // 02: Card Emerging higher from the circle
    await page.waitForTimeout(400);
    await scrollRegion(page);
    await saveScreenshot(page, "02-card-emerging-desktop.png");

    // 03: Card mid-flip with perspective (t ~ 12400ms)
    await page.waitForTimeout(450);
    await scrollRegion(page);
    await saveScreenshot(page, "03-card-flip-desktop.png");
  });

  test("captures desktop phase 04: creator card front revealed and stabilized", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setupMocks(page);

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    const summonLocator = page.getByText("INVOCAÇÃO ARCANO DA RAIZ");
    await expect(summonLocator).toBeVisible({ timeout: 45_000 });

    // Wait until card flips and stabilizes on front face (t ~ 12750ms)
    await page.waitForTimeout(2250);
    await scrollRegion(page);
    await page.waitForTimeout(200);
    await expectFullyVisibleBelowHeader(page, page.getByTestId("creator-card"));
    await saveScreenshot(page, "04-creator-card-front-desktop.png");
    await saveScreenshot(page, "after-card.png");
  });

  test("captures desktop phases 05 to 07: effect activation, score inversion, and final result", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupMocks(page);

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    // The invocation/flip schedule is unchanged; pacing becomes sequential here.
    const effectBadge = page.getByText("EFEITO ATIVADO: INVERSÃO ABSOLUTA");
    await expect(effectBadge).toBeVisible({ timeout: 60_000 });
    const effectAt = Date.now();
    await page.waitForTimeout(650);
    await expectFullyVisibleBelowHeader(page, page.getByTestId("creator-card"));
    await saveScreenshot(page, "05-creator-card-effect-active.png");

    // 06: Score Inversion is released only after the previous card's reading window.
    const scoreInversion = page.locator('[data-duel-event="override-score_inversion"]');
    await expect(scoreInversion).toBeVisible({ timeout: 8_000 });
    const scoreAt = Date.now();
    expect(scoreAt - effectAt).toBeGreaterThanOrEqual(3_300);
    await page.waitForTimeout(650);
    await expectFullyVisibleBelowHeader(page, page.locator('[data-duel-event="override-score_inversion"]'));
    await saveScreenshot(page, "06-score-inversion.png");

    const ascension = page.locator('[data-duel-event="override-creator_ascension"]');
    await expect(ascension).toBeVisible({ timeout: 8_000 });
    const ascensionAt = Date.now();
    expect(ascensionAt - scoreAt).toBeGreaterThanOrEqual(3_300);

    // 07: Official Final Result appears only after ascension is readable and dissolution finishes.
    const finalHeading = page.getByRole("heading", { name: "VITÓRIA — O CRIADOR" });
    await expect(finalHeading).toBeVisible({ timeout: 10_000 });
    const finalAt = Date.now();
    expect(finalAt - ascensionAt).toBeGreaterThanOrEqual(3_800);
    await expect(page.getByText("PLACAR OFICIAL")).toBeVisible();
    await page.waitForTimeout(1_550);
    await page.locator(".creator-override-victory-card").scrollIntoViewIfNeeded();
    await expect(page.locator(".creator-override-victory-card")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveScreenshot(page, "07-creator-final-result.png");
  });

  test("captures mobile 390x844 card front: 08-creator-card-front-mobile-390.png", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMocks(page);

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    const summonLocator = page.getByText("INVOCAÇÃO ARCANO DA RAIZ");
    await expect(summonLocator).toBeVisible({ timeout: 45_000 });

    // Wait until card flips to front face (t = 12500ms + 500ms)
    await page.waitForTimeout(2400);
    await scrollRegion(page);
    await page.waitForTimeout(200);
    await expectFullyVisibleBelowHeader(page, page.getByTestId("creator-card"));
    await saveScreenshot(page, "08-creator-card-front-mobile-390.png");
  });

  test("captures mobile 412x915 card front: 09-creator-card-front-mobile-412.png", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 412, height: 915 });
    await setupMocks(page);

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    const summonLocator = page.getByText("INVOCAÇÃO ARCANO DA RAIZ");
    await expect(summonLocator).toBeVisible({ timeout: 45_000 });

    // Wait until card flips to front face
    await page.waitForTimeout(2400);
    await scrollRegion(page);
    await page.waitForTimeout(200);
    await expectFullyVisibleBelowHeader(page, page.getByTestId("creator-card"));
    await saveScreenshot(page, "09-creator-card-front-mobile-412.png");
  });

  test("captures reduced motion state: 10-reduced-motion-state.png", async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1280, height: 960 });
    await setupMocks(page);

    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    const finalHeading = page.getByRole("heading", { name: "VITÓRIA — O CRIADOR" });
    await expect(finalHeading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("PLACAR OFICIAL")).toBeVisible();

    await page.evaluate(() => {
      document.querySelector(".creator-override-victory-card")?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(300);
    await saveScreenshot(page, "10-reduced-motion-state.png");
  });

  test("captures compact final result on both requested mobile viewports", async ({ page }) => {
    test.setTimeout(45_000);
    await setupMocks(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");
      await expect(page.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeVisible({ timeout: 15_000 });
      await page.locator(".creator-override-victory-card").scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await saveScreenshot(page, `11-creator-final-mobile-${viewport.width}.png`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const buildAnother = page.getByRole("link", { name: "Montar outro duelo" });
      await buildAnother.scrollIntoViewIfNeeded();
      const actionBox = await buildAnother.boundingBox();
      expect(actionBox).not.toBeNull();
      expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
  });

  test("auto-follows normal rounds, yields to manual scrolling, and resumes", async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupNormalDuelMocks(page);
    await page.goto("/duel/alpha/vs/beta");

    await expect(page.locator('[data-duel-event="round-1"]')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await saveScreenshot(page, "12-auto-follow-normal-round.png");

    await page.mouse.wheel(0, -500);
    await expect(page.getByRole("button", { name: "ACOMPANHAR DUELO" })).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "ACOMPANHAR DUELO" }).click();
    await expect(page.getByRole("button", { name: "ACOMPANHANDO DUELO" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-duel-event="round-2"]')).toBeVisible({ timeout: 10_000 });
  });

  test("releases every round card only after its reading window and before the next one", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupNormalDuelMocks(page);
    await page.goto("/duel/alpha/vs/beta");

    const stamps: number[] = [];
    for (const round of [1, 2, 3]) {
      await expect(page.locator(`[data-duel-event="round-${round}"]`)).toBeVisible({ timeout: 15_000 });
      stamps.push(Date.now());
      if (round === 3) break;
      // The visible card is framed in the usable area while it is being read.
      await page.waitForTimeout(1_500);
      await expectFullyVisibleBelowHeader(page, page.locator(`[data-duel-event="round-${round}"]`));
      expect(await page.locator('[data-duel-event^="round-"]').count()).toBe(round);
    }
    expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(3_900);
    expect(stamps[2] - stamps[1]).toBeGreaterThanOrEqual(3_900);
  });

  test("keeps the compact result readable in English", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupMocks(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "VICTORY — THE CREATOR" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveScreenshot(page, "13-creator-final-result-en.png");
  });
});
