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
    await expect(page.getByText("0 / 1 repositórios")).toBeVisible();

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

    await expect(page.getByRole("button", { name: /Summon Sheet/i })).toBeVisible();
    await expect(page.getByText(/Transform your profile into legend/i)).toBeVisible();

    const ptButton = page.getByRole("button", { name: /Mudar para Português/i });
    await ptButton.click();
    await expect(page.getByRole("button", { name: /Invocar Ficha/i })).toBeVisible();
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

  // Flow 10: Geração do share card
  test("Flow 10: Share card modal renders canvas and download button", async ({ page }) => {
    await page.goto("/veteran-dev");
    const shareBtn = page.getByRole("button", { name: /Gerar Cartão de Herói/i });
    await shareBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("canvas")).toBeVisible();
    await expect(page.getByText(/1200 x 630/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Baixar como PNG/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Copiar Link/i })).toBeVisible();
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
    await expect(farol).toContainText("437 / 1.000 stars");
    await expect(farol).toContainText("Faltam 563 stars");

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

    const storm = page.getByRole("button", { name: /Tempestade de Código/i });
    await expect(storm).toContainText("Pelo menos 6.840 commits encontrados");
  });

  // Flow 13: Features descartadas não aparecem
  test("Flow 13: Dropped features (guild, dungeons, buffs, duel) are not visible", async ({ page }) => {
    const dropped = /Guilda|Masmorra|Buffs?\b|Arena de Duelo|Duelo/i;

    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(dropped);

    await page.goto("/veteran-dev");
    await expect(page.locator("h1")).toBeVisible();
    for (const tab of [/Ficha/i, /Habilidades/i, /Conquistas/i, /Títulos/i, /Crônica/i]) {
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

  // Flow 15: Crônica — a jornada contada só com dados reais
  test("Flow 15: Chronicle tab tells the journey from the creation date to the current chapter, in both languages", async ({ page }) => {
    await page.goto("/veteran-dev");
    await page.getByRole("tab", { name: /Crônica/i }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Crônica do Desenvolvedor" })).toBeVisible();
    const chapters = page.getByRole("list", { name: "Linha do tempo da jornada" }).getByRole("heading", { level: 3 });
    await expect(chapters.first()).toHaveText("O Início da Jornada");
    await expect(chapters.last()).toHaveText("Capítulo Atual");
    await expect(page.getByText("Tempo de jornada")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Missão|Missões|Masmorra|Duelo|Ranking|undefined/i);

    await page.getByRole("button", { name: /Switch to English/i }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Developer Chronicle" })).toBeVisible();
    const englishChapters = page.getByRole("list", { name: "Journey timeline" }).getByRole("heading", { level: 3 });
    await expect(englishChapters.first()).toHaveText("The Journey Begins");
    await expect(englishChapters.last()).toHaveText("Current Chapter");
  });

  test("Flow 15b: Chronicle of a brand-new profile is a single honest chapter", async ({ page }) => {
    await page.goto("/empty-dev");
    await page.getByRole("tab", { name: /Crônica/i }).click();

    const chapters = page.getByRole("list", { name: "Linha do tempo da jornada" }).getByRole("heading", { level: 3 });
    await expect(chapters.first()).toHaveText("O Início da Jornada");
    await expect(page.getByText("Ano mais ativo")).toHaveCount(0);
  });

  test("Flow 15c: Chronicle fits a phone screen without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/veteran-dev");
    await page.getByRole("tab", { name: /Crônica/i }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Crônica do Desenvolvedor" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
