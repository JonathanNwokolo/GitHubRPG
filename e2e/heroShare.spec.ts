import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * "Compartilhar Herói" on the mock source:
 * polyglot-dev = a complete sheet with V2 (class, subclass, a lit calendar),
 * rookie-dev   = a complete V1 sheet,
 * veteran-dev  = a PARTIAL sheet (commits not fully read): sharing must be blocked honestly.
 */

const SHEET_URL = /^https:\/\/githubrpg\.vercel\.app\/polyglot-dev$/;
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** The card is drawn by the server on request (about two seconds, more with four workers at once). */
const CARD_TIMEOUT = 20_000;

async function openShare(page: Page, username = "polyglot-dev") {
  await page.goto(`/${username}`);
  await page.locator('[data-character-page-ready="true"]').waitFor();
  const button = page.getByRole("button", { name: /^(Compartilhar Herói|Share Hero)$/ });
  const dialog = page.getByRole("dialog", { name: /^(Compartilhar Herói|Share Hero)$/ });
  await button.click();
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Compartilhar Herói", () => {
  test("opens a modal with the card preview loaded", async ({ page }) => {
    const dialog = await openShare(page);

    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Inside the viewport, not displaced by the page's animated wrapper (V2 sheet).
    const viewport = page.viewportSize()!;
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    const preview = dialog.getByRole("img", { name: /Pré-visualização da Carta Social do Herói de polyglot-dev/ });
    await expect(preview).toBeVisible({ timeout: CARD_TIMEOUT });
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1080);
    expect(await preview.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(1350);

    for (const name of ["Baixar PNG", "Copiar texto", "Copiar link", "Compartilhar no LinkedIn"]) {
      await expect(dialog.getByRole("button", { name })).toBeVisible();
    }
    await expect(dialog.getByText(/a imagem não é enviada automaticamente/)).toBeVisible();
  });

  test("downloads a 1080 x 1350 PNG named after the hero", async ({ page }) => {
    const dialog = await openShare(page);
    await expect(dialog.getByRole("img", { name: /Pré-visualização/ })).toBeVisible({ timeout: CARD_TIMEOUT });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: "Baixar PNG" }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("github-rpg-polyglot-dev.png");
    const path = await download.path();
    expect(pngSize(readFileSync(path))).toEqual({ width: 1080, height: 1350 });
  });

  test("copies the link and the post text", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const dialog = await openShare(page);

    await dialog.getByRole("button", { name: "Copiar link" }).click();
    await expect(dialog.getByText("Link copiado")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(SHEET_URL);

    await dialog.getByRole("button", { name: "Copiar texto" }).click();
    await expect(dialog.getByText("Texto copiado")).toBeVisible();
    const post = await page.evaluate(() => navigator.clipboard.readText());
    expect(post).toContain("Transformei meu perfil do GitHub em um personagem de RPG.");
    expect(post).toMatch(/Classe: .+/);
    expect(post).toMatch(/Nível: \d+/);
    expect(post).toContain("https://githubrpg.vercel.app/polyglot-dev");
    expect(post).toContain("#GitHub");
  });

  test("the LinkedIn action opens the official share URL with the sheet link (no LinkedIn login involved)", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __opened: unknown[][] }).__opened = [];
      window.open = (...args: unknown[]) => {
        (window as unknown as { __opened: unknown[][] }).__opened.push(args);
        return null;
      };
    });
    const dialog = await openShare(page);

    await dialog.getByRole("button", { name: "Compartilhar no LinkedIn" }).click();

    const opened = await page.evaluate(() => (window as unknown as { __opened: unknown[][] }).__opened);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toEqual([
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://githubrpg.vercel.app/polyglot-dev")}`,
      "_blank",
      "noopener,noreferrer",
    ]);
  });

  test("Escape closes it and focus returns to the button", async ({ page }) => {
    const dialog = await openShare(page);
    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Compartilhar Herói" })).toBeFocused();
  });

  test("Tab stays inside the dialog", async ({ page }) => {
    const dialog = await openShare(page);
    await expect(dialog.getByRole("img", { name: /Pré-visualização/ })).toBeVisible({ timeout: CARD_TIMEOUT });

    for (let index = 0; index < 8; index++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
  });

  test("speaks English after the language switch, and asks for the English card", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/polyglot-dev");
    await page.locator('[data-character-page-ready="true"]').waitFor();
    await page.getByRole("button", { name: /Switch to English/i }).click();
    await expect(page.getByRole("button", { name: "Share Hero" })).toBeVisible();
    const request = page.waitForRequest((req) => req.url().includes("/api/card/polyglot-dev/social"));
    const dialog = page.getByRole("dialog", { name: "Share Hero" });
    await page.getByRole("button", { name: "Share Hero" }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img", { name: /Preview of the Hero Social Card of polyglot-dev/ })).toBeVisible({
      timeout: CARD_TIMEOUT,
    });
    expect(new URL((await request).url()).searchParams.get("lang")).toBe("en");
    for (const name of ["Download PNG", "Copy post", "Copy link", "Share on LinkedIn"]) {
      await expect(dialog.getByRole("button", { name })).toBeVisible();
    }

    await dialog.getByRole("button", { name: "Copy link" }).click();
    await expect(dialog.getByText("Link copied")).toBeVisible();
    await dialog.getByRole("button", { name: "Copy post" }).click();
    await expect(dialog.getByText("Post copied")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/Class: .+\r?\nLevel: \d+/);
  });

  test("works on a phone: no horizontal overflow, the card and every action reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await openShare(page);
    await expect(dialog.getByRole("img", { name: /Pré-visualização/ })).toBeVisible({ timeout: CARD_TIMEOUT });

    expect(await overflow(page)).toBeLessThanOrEqual(0);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    for (const name of ["Baixar PNG", "Copiar texto", "Copiar link", "Compartilhar no LinkedIn"]) {
      const button = dialog.getByRole("button", { name });
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
    }
  });
});

test.describe("Compartilhar Herói: honest about what it cannot show", () => {
  test("a partial sheet has no share button, and the image route refuses to draw a degraded card", async ({ page, request }) => {
    await page.goto("/veteran-dev");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Compartilhar Herói" })).toHaveCount(0);

    const response = await request.get("/api/card/veteran-dev/social");
    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(response.headers()["content-type"]).not.toContain("image/png");
  });

  test("the image route is a 1080 x 1350 PNG for a complete sheet, V1 or V2, in both languages", async ({ request }) => {
    for (const path of [
      "/api/card/polyglot-dev/social",
      "/api/card/polyglot-dev/social?lang=en",
      "/api/card/rookie-dev/social",
      "/api/card/empty-dev/social",
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      expect(pngSize(await response.body()), path).toEqual({ width: 1080, height: 1350 });
    }
  });

  test("an unknown hero is a 404, not an image", async ({ request }) => {
    const response = await request.get("/api/card/missing-dev/social");
    expect(response.status()).toBe(404);
  });
});
