import { test, expect } from "@playwright/test";
import { createRPGCharacter } from "@/game/createCharacter";
import { languagesFromShares, makeMaxedProfile, makeProfile, m } from "@/test/builders";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/Home/.gemini/antigravity/brain/ed6b30f7-208e-499b-a234-5bd36c95e998/screenshots";

test.describe("Creator Override Visual Sequence Screenshots", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

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

  test("captures desktop visual sequence across all phases with proper scrolling", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: 960 });

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

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    // 1. FASE 1: Derrota Aparente
    const apparentDefeatLocator = page.getByText("O combate parecia decidido...");
    await expect(apparentDefeatLocator).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => {
      document.querySelector("div[aria-label='Round 5: Assinatura do Herói']")?.scrollIntoView({ behavior: "instant" });
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-derrota-aparente.png"),
      fullPage: false,
    });

    // 2. FASE 2: Anomalia Detectada
    const anomalyLocator = page.getByText("Instabilidade dimensional detectada no tecido da arena.");
    await expect(anomalyLocator).toBeVisible({ timeout: 8_000 });
    await page.evaluate(() => {
      document.querySelector(".creator-override-anomaly-backdrop")?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-anomalia-detectada.png"),
      fullPage: false,
    });

    // 3. FASE 3: Autoridade do Criador e Frase Central
    const loreLocator = page.getByText("“O Criador não pode ser derrotado em seu próprio domínio.”");
    await expect(loreLocator).toBeVisible({ timeout: 8_000 });
    await page.evaluate(() => {
      document.querySelector(".creator-override-authority-backdrop")?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-autoridade-do-criador.png"),
      fullPage: false,
    });

    // 4. FASE 4 / 5: Resultado Final (Official Victory Desktop)
    const finalHeading = page.getByRole("heading", { name: "VITÓRIA — O CRIADOR" });
    await expect(finalHeading).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Histórico dos Rounds: 4 × 1")).toBeVisible();
    await page.evaluate(() => {
      document.querySelector(".creator-override-victory-card")?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-resultado-final-desktop.png"),
      fullPage: false,
    });

    // Also capture fullpage desktop
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-resultado-final-fullpage.png"),
      fullPage: true,
    });
  });

  test("captures mobile visual experience with proper scrolling", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });

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

    await page.goto("/duel/gvanrossum/vs/JonathanNwokolo");

    // Capture Anomaly on mobile
    const anomalyLocator = page.getByText("Instabilidade dimensional detectada no tecido da arena.");
    await expect(anomalyLocator).toBeVisible({ timeout: 25_000 });
    await page.evaluate(() => {
      document.querySelector(".creator-override-anomaly-backdrop")?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-anomalia-mobile.png"),
      fullPage: false,
    });

    // Capture Authority on mobile
    const loreLocator = page.getByText("“O Criador não pode ser derrotado em seu próprio domínio.”");
    await expect(loreLocator).toBeVisible({ timeout: 8_000 });
    await page.evaluate(() => {
      document.querySelector(".creator-override-authority-backdrop")?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-autoridade-mobile.png"),
      fullPage: false,
    });

    // Capture Final Result on mobile
    const finalHeading = page.getByRole("heading", { name: "VITÓRIA — O CRIADOR" });
    await expect(finalHeading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Histórico dos Rounds: 4 × 1")).toBeVisible();
    await page.evaluate(() => {
      document.querySelector(".creator-override-victory-card")?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-resultado-final-mobile.png"),
      fullPage: false,
    });
  });
});
