import { test, expect } from "@playwright/test";

test.describe("GitHub RPG E2E Flows", () => {
  // Flow 1: Landing -> username -> personagem
  test("Flow 1: Landing page summons character on username search", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("GitHub RPG");

    const input = page.locator('input[placeholder*="rookie-dev"]');
    await input.fill("mystic-sorcerer");

    const summonBtn = page.getByRole("button", { name: /Invocar Ficha/i });
    await summonBtn.click();

    await page.waitForURL("/mystic-sorcerer");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/NÍVEL \d+/i).first()).toBeVisible();
  });

  // Flow 2: Persona iniciante
  test("Flow 2: Persona rookie-dev renders Mago/Bardo with engine-derived level", async ({ page }) => {
    await page.goto("/");
    const rookieCard = page.getByRole("heading", { name: /Iniciante/i });
    await rookieCard.click();

    await page.waitForURL("/rookie-dev");
    await expect(page.locator("h1")).toContainText("Arthur Aprendiz");
    await expect(page.getByText("Mago", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Bardo", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tecelão de Interfaces").first()).toBeVisible();
  });

  // Flow 3: Persona veterano
  test("Flow 3: Persona veteran-dev renders high level, class and demo notice", async ({ page }) => {
    await page.goto("/");
    const vetCard = page.getByRole("heading", { name: /Veterano/i });
    await vetCard.click();

    await page.waitForURL("/veteran-dev");
    await expect(page.locator("h1")).toContainText("Valéria da Forja Sagrada");
    await expect(page.getByText("Guerreiro", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Dados de demonstração/i).first()).toBeVisible();
    await expect(page.getByText(/Faltam [\d.]+ XP para o Nível/i)).toBeVisible();
  });

  // Flow 4: Perfil vazio
  test("Flow 4: Persona empty-dev renders Level 1, shows next goals and no dropped features", async ({ page }) => {
    await page.goto("/");
    const emptyCard = page.getByRole("heading", { name: /Perfil Vazio/i });
    await emptyCard.click();

    await page.waitForURL("/empty-dev");
    await expect(page.locator("h1")).toContainText("Fantasma do Vazio");
    await expect(page.getByText(/NÍVEL 1$/i).first()).toBeVisible();
    await expect(page.getByText("Aventureiro", { exact: true }).first()).toBeVisible();

    // Próximo marco: Primeiro Repositório 0 / 1
    await expect(page.getByRole("heading", { name: "Primeiro Repositório" })).toBeVisible();
    await expect(page.getByText("0 / 1 repositório", { exact: true }).first()).toBeVisible();

    await expect(page.getByRole("tab", { name: /Masmorras/i })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Missões/i })).toHaveCount(0);
  });

  // Flow 5: Perfil inexistente (missing-dev)
  test("Flow 5: Missing profile returns a real 404 page without a character sheet", async ({ page }) => {
    const response = await page.goto("/missing-dev");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h2")).toContainText("404");
    await expect(page.locator("body")).not.toContainText(/VEL \d+/i);
    await expect(page.locator("body")).not.toContainText(/Faltam .* XP|XP para|XP total/i);
    await expect(page.locator("body")).not.toContainText(/Habilidades|Conquistas|T.tulos/i);
  });

  test("Flow 5b: Valid profile followed by missing profile does not keep the previous character", async ({ page, request }) => {
    const apiResponse = await request.get("/api/characters/missing-dev");
    expect(apiResponse.status()).toBe(404);

    await page.goto("/veteran-dev");
    await expect(page.locator("h1")).toContainText("Forja Sagrada");

    const response = await page.goto("/missing-dev");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h2")).toContainText("404");
    await expect(page.locator("body")).not.toContainText("Forja Sagrada");
    await expect(page.locator("body")).not.toContainText(/VEL \d+/i);
  });

  // Flow 6: Alteração de idioma
  test("Flow 6: Language switch translates navigation and titles", async ({ page }) => {
    await page.goto("/");
    const enButton = page.getByRole("button", { name: /Switch to English/i });
    await enButton.click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: /Summon Sheet/i })).toBeVisible();
    await expect(page.getByText(/Transform your profile into legend/i)).toBeVisible();

    const ptButton = page.getByRole("button", { name: /Mudar para Português/i });
    await ptButton.click();
    await expect(page.getByRole("button", { name: /Invocar Ficha/i })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });

  test("Flow 6b: PT↔EN on a profile switches the footer and the share action, and <html lang> follows", async ({ page }) => {
    await page.goto("/veteran-dev");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("button", { name: "Gerar Cartão de Herói" })).toBeVisible();

    await page.getByRole("button", { name: /Switch to English/i }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Forge Hero Card" })).toBeVisible();
    await expect(page.locator("footer")).not.toContainText(/Feito com|Todos os direitos|Dados públicos/i);
    // UI chrome follows the language (game content such as achievement names stays in its original Portuguese).
    await expect(page.locator("body")).not.toContainText(/Compartilhar perfil|Gerar Cartão|Baixar Cartão/);
  });

  test("Flow 6c: Design System is not in the public navigation (the route still exists)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header, nav, footer").getByRole("link", { name: /Design System/i })).toHaveCount(0);
    const response = await page.goto("/design-system");
    expect(response?.status()).toBe(200);
  });

  test("Flow 6d: Tabs expose tablist/tab/tabpanel and arrow keys move the selection", async ({ page }) => {
    await page.goto("/veteran-dev");
    const tablist = page.getByRole("tablist").first();
    await expect(tablist).toBeVisible();
    const tabs = tablist.getByRole("tab");
    await tabs.first().focus();
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    const panelId = await tabs.first().getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    await expect(page.locator(`#${panelId}`)).toHaveAttribute("role", "tabpanel");
    await expect(page.locator(`#${panelId}`)).toHaveAttribute("aria-labelledby", (await tabs.first().getAttribute("id")) ?? "");

    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "false");
  });

  test("Flow 6e: Profile pages carry canonical and Open Graph metadata pointing at the card API", async ({ request }) => {
    const response = await request.get("/Veteran-Dev");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/<link rel="canonical" href="[^"]+\/veteran-dev"/);
    expect(html).toMatch(/<meta property="og:image" content="[^"]+\/api\/card\/veteran-dev"/);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');

    const landing = await (await request.get("/")).text();
    expect(landing).toMatch(/<link rel="canonical" href="https?:\/\/[^"\/]+\/?"/);
    // The landing image is the square logo, so the matching Twitter card is the small "summary".
    expect(landing).toContain('name="twitter:card" content="summary"');
  });

  test("Flow 5c: Unknown profile is a real 404 (not a streamed 200) and is not indexable", async ({ request }) => {
    // The mock source only treats "missing-dev" as unknown; the real source is smoke-tested separately.
    const response = await request.get("/missing-dev");
    expect(response.status()).toBe(404);
    expect(await response.text()).toMatch(/noindex/);
  });

  // Flow 7: Reduced motion
  test("Flow 7: Reduced motion preference adds class and toggles state", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/Preferências do Sistema/i)).toBeVisible();

    const reduceButton = page.getByRole("button", { name: /Sempre Reduzir Animações/i });
    await reduceButton.click();

    const html = page.locator("html");
    await expect(html).toHaveClass(/reduced-motion/);
  });

  // Flow 8: Navegação por teclado das skills (linguagens)
  test("Flow 8: Skills are language affinities and navigable via keyboard", async ({ page }) => {
    await page.goto("/veteran-dev");
    const skillsTab = page.getByRole("tab", { name: /Habilidades/i });
    await skillsTab.click();

    await expect(page.getByText(/não domínio profissional/i)).toBeVisible();

    const rustSkillBtn = page.getByRole("button", { name: /Rust/ }).first();
    await rustSkillBtn.focus();
    await expect(rustSkillBtn).toBeFocused();

    // Trigger modal via Enter key
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  // Flow 9: Títulos — equipar e persistir localmente
  test("Flow 9: Only one title is equipped and the choice persists locally", async ({ page }) => {
    await page.goto("/popular-dev");
    await expect(page.locator("h1")).toContainText("Estela Brilhante");

    await page.getByRole("tab", { name: /Títulos/i }).click();
    await page.getByRole("button", { name: /Equipar: Caçador de Estrelas/i }).click();
    await expect(page.getByText("« Caçador de Estrelas »")).toBeVisible();

    await page.reload();
    await expect(page.getByText("« Caçador de Estrelas »")).toBeVisible();

    await page.getByRole("tab", { name: /Títulos/i }).click();
    await page.getByRole("button", { name: /Usar título padrão/i }).click();
    await expect(page.getByText("« Caçador de Estrelas »")).toHaveCount(0);
  });

  // Flow 10: Compartilhar perfil / baixar cartão
  test("Flow 10: Share modal renders the card, both actions, and closes by Escape returning focus", async ({ page }) => {
    await page.goto("/veteran-dev");
    const trigger = page.getByRole("button", { name: /Gerar Cartão de Herói/i });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: /Cartão de Aventureiro/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.locator("canvas")).toBeVisible();
    await expect(dialog.getByText(/1200 x 630/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Compartilhar perfil" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Baixar Cartão de Herói" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("Flow 10a: Share profile uses the Web Share API with the profile link, never the image URL", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __shared: unknown[] };
      w.__shared = [];
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (data: unknown) => {
          w.__shared.push(data);
          return Promise.resolve();
        },
      });
    });
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: /Gerar Cartão de Herói/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Compartilhar perfil" }).click();

    await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(1);
    const shared = (await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared[0])) as {
      title: string;
      text: string;
      url: string;
    };
    expect(shared.url).toMatch(/\/veteran-dev$/);
    expect(shared.url).not.toContain("/api/");
    expect(shared.title).toContain("veteran-dev");
    expect(shared.text).toContain("GitHub RPG");
    // The native sheet already confirmed it: no extra toast, no error.
    await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
  });

  test("Flow 10b-cancel: dismissing the native share sheet is not an error", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: () => Promise.reject(new DOMException("Share canceled", "AbortError")),
      });
    });
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: /Gerar Cartão de Herói/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Compartilhar perfil" }).click();

    await expect(dialog.getByRole("button", { name: "Compartilhar perfil" })).toBeEnabled();
    await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
    await expect(page.getByText("Link copiado!")).toHaveCount(0);
  });

  test("Flow 10c: Without Web Share the profile link is copied and 'Link copiado!' is announced", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __copied: string[] };
      w.__copied = [];
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: (text: string) => {
            w.__copied.push(text);
            return Promise.resolve();
          },
        },
      });
    });
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: /Gerar Cartão de Herói/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Compartilhar perfil" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Link copiado!" })).toBeVisible();
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatch(/\/veteran-dev$/);
    expect(copied[0]).not.toContain("/api/");
  });

  test("Flow 10d: Download Hero Card still delivers the PNG", async ({ page }) => {
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: /Gerar Cartão de Herói/i }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("dialog").getByRole("button", { name: "Baixar Cartão de Herói" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("github-rpg-veteran-dev.png");
  });

  test("Flow 10e: The share dialog keeps focus inside (Tab cycles) and unlocks scroll on close", async ({ page }) => {
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: /Gerar Cartão de Herói/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
      expect(inside).toBe(true);
    }
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    await dialog.getByRole("button", { name: "Fechar" }).first().click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
  });

  test("Flow 10b: Card image API endpoint returns 200 with PNG image", async ({ request }) => {
    const response = await request.get("/api/card/veteran-dev");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(1000);
  });

  // Flow 11: Progressão visível — tenho / meta / falta
  test("Flow 11: Visible progression shows have, goal and remaining", async ({ page }) => {
    await page.goto("/popular-dev");
    await page.getByRole("tab", { name: /Conquistas/i }).click();

    const farol = page.getByRole("button", { name: /Farol dos Reinos/i });
    await expect(farol).toContainText("437 / 1.000 estrelas");
    await expect(farol).toContainText("Faltam 563 estrelas");

    const guardian = page.getByRole("button", { name: /Antigo Guardião/i });
    await expect(guardian).toContainText("4,2 / 5 anos");
    await expect(guardian).toContainText(/Faltam aproximadamente \d+ meses/);
  });

  // Flow 12: Cobertura parcial — nunca "faltam exatamente X"
  test("Flow 12: Partial data never claims what is missing", async ({ page }) => {
    await page.goto("/veteran-dev");
    await page.getByRole("tab", { name: /Conquistas/i }).click();

    const eternal = page.getByRole("button", { name: /Forjador Incansável/i });
    await expect(eternal).toContainText("Pelo menos 6.840 commits encontrados");
    await expect(eternal).not.toContainText(/Faltam/i);

    // The card itself, not its "Compartilhar" action (which also carries the achievement's name).
    const storm = page.getByRole("button", { name: /Tempestade de Código/i }).filter({ hasNotText: "Compartilhar" });
    await expect(storm).toContainText("Pelo menos 6.840 commits encontrados");
  });

  // Flow 13: Features descartadas não aparecem
  test("Flow 13: Dropped features (guild, dungeons, buffs, duel) are not visible", async ({ page }) => {
    const dropped = /Guilda|Masmorra|Buffs?\b|Arena de Duelo|Duelo/i;

    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(dropped);

    await page.goto("/veteran-dev");
    await expect(page.locator("h1")).toBeVisible();
    for (const tab of [/Ficha/i, /Habilidades/i, /Conquistas/i, /Títulos/i]) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.locator("body")).not.toContainText(dropped);
    }
    await expect(page.getByRole("tab", { name: /Duelo|Masmorras|Guilda/i })).toHaveCount(0);
  });

  // Flow 14: Transparência
  test("Flow 14: Gamification disclaimer is visible", async ({ page }) => {
    await page.goto("/veteran-dev");
    await expect(
      page.getByText(/gamificação da atividade pública disponível e não uma avaliação de habilidade profissional/i).first()
    ).toBeVisible();
  });

  // Flow 15: Crônica da Jornada — seção da Ficha, só com dados reais
  test("Flow 15: the Chronicle is a section of the Ficha (no tab of its own), in both languages", async ({ page }) => {
    await page.goto("/veteran-dev");

    await expect(page.getByRole("tab", { name: /Crônica/i })).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(4);
    await expect(page.getByRole("heading", { level: 2, name: "Crônica da Jornada" })).toBeVisible();
    await expect(page.getByText("Tempo de jornada")).toBeVisible();

    // Narrative order of the Ficha: next milestones, the Chronicle, then the technical attributes.
    const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
    const order = [/Próximos Marcos/i, /Crônica da Jornada/i, /Atributos T.cnicos/i].map((name) =>
      headings.findIndex((heading) => name.test(heading))
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));

    const preview = page.getByRole("list", { name: "Linha do tempo da jornada" }).getByRole("heading", { level: 3 });
    expect(await preview.count()).toBeLessThanOrEqual(3);
    await expect(preview.first()).toHaveText("O Início da Jornada");
    await expect(preview.last()).toHaveText("Capítulo Atual");
    await expect(page.locator("body")).not.toContainText(/Missão|Missões|Masmorra|Duelo|Ranking|undefined/i);

    await page.getByRole("button", { name: /Switch to English/i }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Journey Chronicle" })).toBeVisible();
    const englishChapters = page.getByRole("list", { name: "Journey timeline" }).getByRole("heading", { level: 3 });
    await expect(englishChapters.first()).toHaveText("The Journey Begins");
    await expect(englishChapters.last()).toHaveText("Current Chapter");
    await expect(page.getByRole("button", { name: "View full chronicle" })).toBeVisible();
  });

  test("Flow 15a: 'Ver toda a Crônica' expands the timeline inline by keyboard and collapses it back", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/|api\.github\.com/.test(request.url())) apiCalls.push(request.url());
    });
    await page.goto("/veteran-dev");
    const url = page.url();

    const chapters = page.getByRole("list", { name: "Linha do tempo da jornada" }).getByRole("heading", { level: 3 });
    // Wait for the timeline to be on screen before counting (count() does not auto-wait).
    await expect(chapters.first()).toBeVisible();
    const collapsedCount = await chapters.count();
    const button = page.getByRole("button", { name: /Ver toda a Crônica/i });
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.focus();
    await page.keyboard.press("Enter");
    const collapse = page.getByRole("button", { name: /Recolher Crônica/i });
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    await expect(collapse).toBeFocused();
    expect(await chapters.count()).toBeGreaterThan(collapsedCount);

    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: /Ver toda a Crônica/i })).toHaveAttribute("aria-expanded", "false");
    expect(await chapters.count()).toBe(collapsedCount);

    // Inline: same page, and expanding fetched nothing.
    expect(page.url()).toBe(url);
    expect(apiCalls).toEqual([]);
  });

  test("Flow 15b: Chronicle of a brand-new profile is a single honest chapter", async ({ page }) => {
    await page.goto("/empty-dev");

    const chapters = page.getByRole("list", { name: "Linha do tempo da jornada" }).getByRole("heading", { level: 3 });
    await expect(chapters.first()).toHaveText("O Início da Jornada");
    await expect(page.getByText("Ano mais ativo")).toHaveCount(0);
  });

  test("Flow 15c: Chronicle fits a phone screen without horizontal scroll, collapsed and expanded", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/veteran-dev");
    await expect(page.getByRole("heading", { level: 2, name: "Crônica da Jornada" })).toBeVisible();

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: /Ver toda a Crônica/i }).click();
    await expect(page.getByRole("button", { name: /Recolher Crônica/i })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });

  // Flow 16: "Por que esta classe?"
  test("Flow 16: 'Why this class?' explains the class and subclass from the real language data", async ({ page }) => {
    await page.goto("/veteran-dev");
    const trigger = page.getByRole("button", { name: "Por que esta classe?" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Por que Guerreiro?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("No GitHub RPG: Rust → Guerreiro")).toBeVisible();
    await expect(dialog.getByText("No GitHub RPG: TypeScript → Mago")).toBeVisible();
    await expect(dialog.getByText(/Não mede habilidade profissional/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("Flow 16b: the explanation follows the language switch", async ({ page }) => {
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: /Switch to English/i }).click();
    await page.getByRole("button", { name: "Why this class?" }).click();

    const dialog = page.getByRole("dialog", { name: "Why Guerreiro?" });
    await expect(dialog.getByText("In GitHub RPG: Rust → Guerreiro")).toBeVisible();
    await expect(dialog.getByText(/does not measure professional skill/)).toBeVisible();
  });

  // Flow 17: badge para README
  test("Flow 17: 'Add to README' shows the badge and copies the Markdown", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __copied: string[] };
      w.__copied = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: (text: string) => {
            w.__copied.push(text);
            return Promise.resolve();
          },
        },
      });
    });
    await page.goto("/veteran-dev");
    await page.getByRole("button", { name: "Adicionar ao README" }).click();

    const dialog = page.getByRole("dialog", { name: "Adicionar ao README" });
    const badge = dialog.getByRole("img", { name: "Pré-visualização do badge" });
    await expect(badge).toBeVisible();
    await expect.poll(() => badge.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await dialog.getByRole("button", { name: "Copiar Markdown" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Markdown copiado!" })).toBeVisible();
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatch(/^\[!\[GitHub RPG\]\(https?:\/\/[^)]+\/api\/badge\/veteran-dev\)\]\(https?:\/\/[^)]+\/veteran-dev\)$/);
  });

  test("Flow 17b: the badge endpoint is a small, cacheable, script-free SVG; unknown users are a 404", async ({ request }) => {
    const response = await request.get("/api/badge/Veteran-Dev");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    expect(response.headers()["cache-control"]).toMatch(/s-maxage=\d+/);
    expect(response.headers()["cache-control"]).toMatch(/stale-while-revalidate=\d+/);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    const svg = await response.text();
    expect(svg.length).toBeLessThan(2_000);
    expect(svg).toMatch(/LV\.\d+/);
    expect(svg).toContain("Guerreiro");
    expect(svg).not.toMatch(/<script|foreignObject|\son\w+=/i);

    expect((await request.get("/api/badge/missing-dev")).status()).toBe(404);
  });

  // Flow 18: compartilhar conquista
  test("Flow 18: an unlocked achievement can be shared and downloaded; a locked one cannot", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __shared: unknown[] };
      w.__shared = [];
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (data: unknown) => {
          w.__shared.push(data);
          return Promise.resolve();
        },
      });
    });
    await page.goto("/veteran-dev");
    await page.getByRole("tab", { name: /Conquistas/i }).click();

    const shareButtons = page.getByRole("button", { name: /^Compartilhar conquista: / });
    expect(await shareButtons.count()).toBeGreaterThan(0);
    // Locked achievements exist on this persona, and none of them offers the action.
    expect(await shareButtons.count()).toBeLessThan(await page.getByRole("heading", { level: 3 }).count());

    await shareButtons.first().focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Compartilhar conquista" });
    const preview = dialog.getByRole("img");
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: "Baixar imagem" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^github-rpg-veteran-dev-achievement-[a-z0-9-]+\.png$/);

    await dialog.getByRole("button", { name: "Compartilhar", exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(1);
    const shared = (await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared[0])) as { url: string };
    expect(shared.url).toMatch(/\/veteran-dev$/);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("Flow 18b: achievement cards exist only for achievements the user really unlocked", async ({ request }) => {
    const character = (await (await request.get("/api/characters/veteran-dev")).json()) as {
      achievements: Array<{ id: string; unlocked: boolean }>;
    };
    const unlocked = character.achievements.find((a) => a.unlocked)!;
    const locked = character.achievements.find((a) => !a.unlocked)!;

    const ok = await request.get(`/api/card/veteran-dev/achievement/${unlocked.id}`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["content-type"]).toBe("image/png");

    expect((await request.get(`/api/card/veteran-dev/achievement/${locked.id}`)).status()).toBe(404);
    expect((await request.get("/api/card/veteran-dev/achievement/foo")).status()).toBe(404);
    expect((await request.get("/api/card/veteran-dev/achievement/..%2Fetc")).status()).toBe(400);
    expect((await request.get(`/api/card/missing-dev/achievement/${unlocked.id}`)).status()).toBe(404);
  });

  // Flow 19: compartilhar capítulo da Crônica
  test("Flow 19: a Chronicle chapter can be shared and downloaded", async ({ page }) => {
    await page.goto("/veteran-dev");

    const shareChapter = page.getByRole("button", { name: /^Compartilhar capítulo \d{4}:/ }).first();
    await expect(shareChapter).toBeVisible();
    await shareChapter.click();

    const dialog = page.getByRole("dialog", { name: "Compartilhar capítulo" });
    const preview = dialog.getByRole("img");
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: "Baixar imagem" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^github-rpg-veteran-dev-chronicle-\d{4}\.png$/);
  });

  test("Flow 19b: Chronicle cards exist only for real chapters", async ({ request }) => {
    expect((await request.get("/api/card/veteran-dev/chronicle/2015")).status()).toBe(200);
    expect((await request.get("/api/card/veteran-dev/chronicle/1999")).status()).toBe(404);
    expect((await request.get("/api/card/veteran-dev/chronicle/abc")).status()).toBe(400);
    expect((await request.get("/api/card/missing-dev/chronicle/2015")).status()).toBe(404);
  });

  test("Flow 19c: the new actions fit a phone screen without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/veteran-dev");
    await expect(page.getByRole("button", { name: "Por que esta classe?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar ao README" })).toBeVisible();

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: "Adicionar ao README" }).click();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
