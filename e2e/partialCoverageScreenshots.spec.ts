import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.join(process.cwd(), "test-results", "partial-coverage-screenshots");

async function capture(page: Page, filename: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test.describe("Partial calculation coverage visual evidence", () => {
  test("captures complete and partial profile states at desktop and laptop sizes", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/popular-dev");
    await expect(page.locator("h1")).toContainText("Estela Brilhante");
    await expect(page.getByText("Ficha parcialmente revelada")).toHaveCount(0);
    await capture(page, "01-complete-profile-1920x1080.png");

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/veteran-dev");
    await expect(page.getByText("Ficha parcialmente revelada")).toBeVisible();
    await expect(page.getByText(/Faltam [\d.]+ XP para o Nível/i)).toHaveCount(0);
    await capture(page, "02-partial-profile-1366x768.png");
  });

  test("captures unavailable attributes and a blocked duel on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/veteran-dev");
    const attributes = page.getByRole("heading", { name: "Atributos Técnicos" });
    await expect(attributes).toBeVisible();
    await attributes.scrollIntoViewIfNeeded();
    await capture(page, "03-unavailable-attributes-390x844.png");

    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto("/duel/veteran-dev/vs/popular-dev");
    await expect(page.getByRole("heading", { name: "Duelo temporariamente indisponível" })).toBeVisible();
    await capture(page, "04-partial-duel-blocked-412x915.png");
  });

  test("captures Hall filtering and safe card/badge failures", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    const hall = page.getByRole("region", { name: "Salão dos Heróis" });
    await expect(hall.getByText("Alguns aventureiros estão em jornada e não puderam chegar ao salão.")).toBeVisible();
    await hall.scrollIntoViewIfNeeded();
    await capture(page, "05-hall-with-partial-profile-filtered-1920x1080.png");

    await page.setViewportSize({ width: 1366, height: 768 });
    const cardResponse = await page.goto("/api/card/veteran-dev");
    expect(cardResponse?.status()).toBe(503);
    await expect(page.getByText(/Ficha parcialmente indisponível/)).toBeVisible();
    await capture(page, "06-partial-card-1366x768.png");

    await page.setViewportSize({ width: 412, height: 915 });
    const badgeResponse = await page.goto("/api/badge/veteran-dev");
    expect(badgeResponse?.status()).toBe(503);
    await expect(page.getByText(/Ficha parcialmente indisponível/)).toBeVisible();
    await capture(page, "07-partial-badge-412x915.png");
  });
});
