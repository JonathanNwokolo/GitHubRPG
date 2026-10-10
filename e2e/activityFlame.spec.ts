import { expect, test, type Page } from "@playwright/test";

/**
 * "Chama da Atividade" on the mock source (deterministic demo calendars):
 * veteran-dev = a long history, rookie-dev = a small one, empty-dev = a calendar with nothing ever lit.
 */

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const flame = (page: Page) => page.getByRole("region", { name: /Chama da Atividade|Flame of Activity/ });
const ENERGY_LINE = /^(Nível de energia|Energy level):/;

test.describe("Chama da Atividade", () => {
  test("sits right below the Chronicle, with the year selector, figures, heatmap, reading and records", async ({ page }) => {
    await page.goto("/veteran-dev");
    const section = flame(page);
    await expect(section).toBeVisible();

    // Directly after the Chronicle in the document.
    const next = await page.evaluate(() => document.getElementById("chronicle")?.nextElementSibling?.id ?? null);
    expect(next).toBe("activity-flame");

    await expect(section.getByRole("heading", { level: 2, name: "Chama da Atividade" })).toBeVisible();
    await expect(section.getByText("A energia que moldou esta lenda.")).toBeVisible();
    await expect(section.getByRole("radiogroup", { name: "Anos da jornada" })).toBeVisible();
    await expect(section.getByRole("grid", { name: /Calendário de energia de \d{4}/ })).toBeVisible();
    await expect(section.getByText("Maior sequência").first()).toBeVisible();
    await expect(section.getByRole("heading", { name: "Leitura dos Oráculos" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Recordes do Herói" })).toBeVisible();
  });

  test("time travel: switching the year changes the heatmap, the figures and the records", async ({ page }) => {
    await page.goto("/veteran-dev");
    const section = flame(page);
    const tabs = section.getByRole("radio");
    expect(await tabs.count()).toBeGreaterThan(3);

    const read = async () => ({
      figures: await section.getByRole("list").first().innerText(),
      records: await section.getByRole("heading", { name: "Recordes do Herói" }).locator("xpath=..").innerText(),
      grid: await section.getByRole("grid").getAttribute("aria-label"),
    });

    const newest = (await section.getByRole("radio", { checked: true }).innerText()).trim();
    const before = await read();

    // Move to a different, finished year.
    const years = (await tabs.allInnerTexts()).map((text) => text.trim());
    const other = years.find((year) => year !== newest && year !== years[0])!;
    await section.getByRole("radio", { name: other }).click();

    await expect(section.getByRole("radio", { checked: true })).toHaveText(other);
    await expect(section.getByRole("grid")).toHaveAttribute("aria-label", `Calendário de energia de ${other}`);
    const after = await read();
    expect(after.grid).not.toBe(before.grid);
    expect(after.figures).not.toBe(before.figures);
    expect(after.records).not.toBe(before.records);
    await expect(section.getByRole("group", { name: `Chama de ${other}` })).toBeVisible();
  });

  test("hover and keyboard show the tooltip with date, contributions and energy level", async ({ page }) => {
    await page.goto("/veteran-dev");
    const section = flame(page);
    const cell = section.getByRole("gridcell").last();
    await cell.scrollIntoViewIfNeeded();
    // Let the ignition finish: hover targets must not be mid-animation.
    await expect(section.locator('.af-heat[data-phase="settled"]')).toHaveCount(1, { timeout: 5000 });

    await cell.hover();
    await expect(section.getByText(ENERGY_LINE)).toBeVisible();

    await page.mouse.move(0, 0);
    await expect(section.getByText(ENERGY_LINE)).toHaveCount(0);

    // Keyboard: one tab stop; arrows move between days and show the tooltip.
    const stop = section.locator('[role="gridcell"][tabindex="0"]');
    await expect(stop).toHaveCount(1);
    await stop.focus();
    await expect(section.getByText(ENERGY_LINE)).toBeVisible();
    const first = await stop.getAttribute("aria-label");
    await page.keyboard.press("ArrowLeft");
    await expect(section.locator('[role="gridcell"][tabindex="0"]')).not.toHaveAttribute("aria-label", first!);
    await page.keyboard.press("Escape");
    await expect(section.getByText(ENERGY_LINE)).toHaveCount(0);
  });

  test("language switch translates the section, including dates and level names", async ({ page }) => {
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: /Switch to English/i }).click();
    const section = flame(page);

    await expect(section.getByRole("heading", { level: 2, name: "Flame of Activity" })).toBeVisible();
    await expect(section.getByText("The energy that shaped this legend.")).toBeVisible();
    await expect(section.getByRole("radiogroup", { name: "Years of the journey" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Reading of the Oracles" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Hero Records" })).toBeVisible();
    await expect(section.getByRole("grid")).toHaveAttribute("aria-label", /Energy calendar of \d{4}/);
    await expect(section.getByRole("gridcell").last()).toHaveAttribute("aria-label", /Energy level: /);
  });

  test("a small profile has few years and still reads well", async ({ page }) => {
    await page.goto("/rookie-dev");
    const section = flame(page);
    await expect(section).toBeVisible();
    await expect(section.getByRole("radio").first()).toBeVisible();
    await expect(section.getByRole("grid")).toBeVisible();
    await expect(section.getByRole("heading", { name: "Recordes do Herói" })).toBeVisible();
  });

  test("a calendar in which nothing was ever lit gets an elegant panel, never an error", async ({ page }) => {
    await page.goto("/empty-dev");
    const section = flame(page);

    await expect(section).toBeVisible();
    await expect(section.getByRole("status")).toContainText("Nenhuma chama foi acesa ainda.");
    await expect(section.getByRole("grid")).toHaveCount(0);
    await expect(section.getByRole("radiogroup")).toHaveCount(0);
  });

  test("fits desktop, tablet and phone without horizontal overflow", async ({ page }) => {
    test.setTimeout(60_000);
    for (const width of [1440, 1024, 768, 390, 375]) {
      await page.setViewportSize({ width, height: width <= 390 ? 812 : 900 });
      await page.goto("/veteran-dev");
      const section = flame(page);
      await section.scrollIntoViewIfNeeded();
      await expect(section.getByRole("grid")).toBeVisible();
      expect(await overflow(page), `${width}px`).toBeLessThanOrEqual(0);

      const box = await section.getByRole("heading", { name: "Recordes do Herói" }).boundingBox();
      expect(box, `${width}px records`).not.toBeNull();
      expect(box!.x + box!.width, `${width}px records`).toBeLessThanOrEqual(width + 1);
    }
  });

  test("on a phone the heatmap scrolls on its own and the tooltip stays on screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/veteran-dev");
    const section = flame(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('.af-heat[data-phase="settled"]')).toHaveCount(1, { timeout: 5000 });

    const cell = section.getByRole("gridcell").last();
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    const tooltip = section.getByText(ENERGY_LINE);
    await expect(tooltip).toBeVisible();
    const box = (await tooltip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(376);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("reduced motion: the runes are lit at once and nothing animates", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/veteran-dev");
    const section = flame(page);
    await section.scrollIntoViewIfNeeded();

    const cell = section.getByRole("gridcell").last();
    await expect(cell).toBeVisible();
    const style = await cell.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { opacity: computed.opacity, animation: computed.animationName };
    });
    expect(style.opacity).toBe("1");
    expect(style.animation).toBe("none");
  });
});
