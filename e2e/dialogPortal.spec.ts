import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "artifacts", "technical-debt");

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

async function openHeroDialog(page: import("@playwright/test").Page) {
  await page.goto("/polyglot-dev");
  await page.getByRole("button", { name: "Compartilhar Herói" }).click();
  const dialog = page.getByRole("dialog", { name: "Compartilhar Herói" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: /Pré-visualização/ })).toBeVisible({ timeout: 30_000 });
  expect(await dialog.evaluate((node) => node.parentElement?.parentElement === document.body)).toBe(true);
  return dialog;
}

test("a V2 dialog is portaled and centered on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const dialog = await openHeroDialog(page);
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1440);
  expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: path.join(OUT_DIR, "dialog-v2-desktop.png") });
});

test("a V2 dialog is portaled and contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openHeroDialog(page);
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: path.join(OUT_DIR, "dialog-v2-mobile.png") });
});
