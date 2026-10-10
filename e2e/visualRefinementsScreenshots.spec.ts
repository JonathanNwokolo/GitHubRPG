import { test, expect, type Page } from "@playwright/test";
import { createRPGCharacter } from "@/game/createCharacter";
import { languagesFromShares, makeMaxedProfile, makeProfile, m } from "@/test/builders";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/Home/.gemini/antigravity/brain/8e39c1b9-592e-4215-a2ac-366bb1f72491/screenshots";
const PUBLIC_SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots", "refinements");

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
  try {
    fs.copyFileSync(primaryPath, publicPath);
  } catch {
    // If target is temporarily locked by viewer, retry after brief delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      fs.copyFileSync(primaryPath, publicPath);
    } catch {
      // Ignored
    }
  }
}

test.describe("Visual Refinements — Imperial Seal, Duel VS Medallion & Runic Input", () => {
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

  const setupCreatorMocks = async (page: Page) => {
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

  test("1. Home Runic Summon Input — Desktop 1920x1080 states (normal, hover, focus)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    const input = page.locator("#hero-profile-input");
    await expect(input).toBeVisible();

    // Verify placeholder
    await expect(input).toHaveAttribute("placeholder", "Nome do herói ou github.com/usuário");

    // Normal state
    await saveScreenshot(page, "home-1920x1080-input-normal.png");

    // Hover state
    await input.hover();
    await page.waitForTimeout(200);
    await saveScreenshot(page, "home-1920x1080-input-hover.png");

    // Focus state (keyboard tab navigation)
    await input.focus();
    await page.waitForTimeout(200);
    await saveScreenshot(page, "home-1920x1080-input-focus.png");

    // Typing state
    await input.fill("torvalds");
    await page.waitForTimeout(150);
    await saveScreenshot(page, "home-1920x1080-input-typed.png");

    // Check no horizontal overflow
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("2. Home Runic Summon Input — Laptop 1366x768 and Mobile 390x844", async ({ page }) => {
    // 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/");
    const input1366 = page.locator("#hero-profile-input");
    await expect(input1366).toBeVisible();
    await saveScreenshot(page, "home-1366x768-input.png");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // 390x844 (Mobile iPhone 12/13/14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const inputMobile = page.locator("#hero-profile-input");
    await expect(inputMobile).toBeVisible();
    await inputMobile.focus();
    await page.waitForTimeout(200);
    await saveScreenshot(page, "home-390x844-mobile-input.png");

    // Verify no horizontal overflow on mobile
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("3. Creator Override Final Screen — Imperial Sovereign Seal & Scoreboard VS across viewports", async ({ page }) => {
    test.setTimeout(60_000);
    await setupCreatorMocks(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Desktop 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");
    await expect(page.getByRole("heading", { name: "VITÓRIA — O CRIADOR" })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".creator-override-victory-crest")).toBeVisible();
    await expect(page.getByText("PLACAR OFICIAL")).toBeVisible();
    await page.locator(".creator-override-victory-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await saveScreenshot(page, "creator-override-1920x1080-final.png");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Laptop 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator(".creator-override-victory-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await saveScreenshot(page, "creator-override-1366x768-final.png");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.querySelector(".creator-override-victory-card")?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(250);
    await saveScreenshot(page, "creator-override-390x844-mobile-final.png");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("4. Normal Duel — VS Medallion on Stage Header, Round Cards, and Scoreboard", async ({ page }) => {
    test.setTimeout(60_000);
    await setupNormalDuelMocks(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Desktop 1920x1080
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/duel/alpha/vs/beta");

    // Stage header VS medallion
    await page.waitForTimeout(500);
    await saveScreenshot(page, "duel-normal-1920x1080-stage.png");

    // Round card VS medallion
    const roundCard = page.locator('[data-duel-event="round-1"]');
    await expect(roundCard).toBeVisible({ timeout: 15_000 });
    await roundCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await saveScreenshot(page, "duel-normal-1920x1080-round-card.png");

    // Skip animation to scoreboard
    const skipBtn = page.getByRole("button", { name: "Pular animação" });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }
    await page.waitForTimeout(500);

    const outcomeTitle = page.locator("#duel-result-title");
    await expect(outcomeTitle).toBeVisible({ timeout: 15_000 });
    await outcomeTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await saveScreenshot(page, "duel-normal-1920x1080-scoreboard.png");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await saveScreenshot(page, "duel-normal-390x844-mobile.png");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("5. Duel Builder — Central Confrontation VS Medallion", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/duel");

    await expect(page.getByText("Montar duelo")).toBeVisible();
    await page.waitForTimeout(300);
    await saveScreenshot(page, "duel-builder-1920x1080.png");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
