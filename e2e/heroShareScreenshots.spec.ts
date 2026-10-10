import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Review screenshots of "Compartilhar Herói" (mock source). They are written to artifacts/hero-social-card, next to
 * the sample cards of `npm run social-card:samples`:
 *   04-social-card-preview-dialog.png   the dialog on a desktop, showing the sample card of Guido van Rossum
 *   05-profile-vs-social-card.png       the character sheet header and the live card of the same hero, side by side
 */

const OUT_DIR = path.join(process.cwd(), "artifacts", "hero-social-card");
const GUIDO = path.join(OUT_DIR, "01-social-card-guido.png");

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

test("the share dialog on a desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (existsSync(GUIDO)) {
    // The sample card of a hero the mock source does not have: only the image changes, the dialog is the real one.
    await page.route("**/api/card/polyglot-dev/social**", (route) =>
      route.fulfill({ status: 200, contentType: "image/png", body: readFileSync(GUIDO) })
    );
  }
  await page.goto("/polyglot-dev");
  await page.getByRole("button", { name: "Compartilhar Herói" }).click();

  const dialog = page.getByRole("dialog", { name: "Compartilhar Herói" });
  await expect(dialog.getByRole("img", { name: /Pré-visualização/ })).toBeVisible();
  await expect
    .poll(() => dialog.getByRole("img", { name: /Pré-visualização/ }).evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1080);

  await page.screenshot({ path: path.join(OUT_DIR, "04-social-card-preview-dialog.png") });
});

test("the character sheet and the social card of the same hero, side by side", async ({ page, request, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/polyglot-dev");
  const header = page.getByRole("region", { name: "Pietra Poliglota" });
  await expect(header).toBeVisible();
  // This visual-only suite waits for the entrance animation; it is excluded from the functional E2E gate.
  await header.evaluate((element) => Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)));
  const sheet = await header.screenshot();

  const response = await request.get("/api/card/polyglot-dev/social");
  expect(response.status()).toBe(200);
  const card = await response.body();

  const context = await browser.newContext({ viewport: { width: 1500, height: 760 }, deviceScaleFactor: 1 });
  const compare = await context.newPage();
  const uri = (bytes: Buffer) => `data:image/png;base64,${bytes.toString("base64")}`;
  await compare.setContent(`<!doctype html><html><body style="margin:0;background:#0d0b0d;display:flex;gap:28px;align-items:center;justify-content:center;height:760px;padding:0 24px;box-sizing:border-box;font-family:sans-serif;color:#a99f8c">
    <figure style="margin:0;flex:1;min-width:0"><img src="${uri(sheet)}" style="width:100%;display:block;border:1px solid #70502a"/><figcaption style="padding-top:10px;font-size:14px;letter-spacing:.08em;text-transform:uppercase">Ficha principal</figcaption></figure>
    <figure style="margin:0;height:700px"><img src="${uri(card)}" style="height:660px;width:auto;display:block;border:1px solid #70502a"/><figcaption style="padding-top:10px;font-size:14px;letter-spacing:.08em;text-transform:uppercase">Carta Social do Herói</figcaption></figure>
  </body></html>`);
  const file = path.join(OUT_DIR, "05-profile-vs-social-card.png");
  writeFileSync(file, await compare.screenshot());
  await context.close();
});
