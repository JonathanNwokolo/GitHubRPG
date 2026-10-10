import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { buildClassExplanation } from "@/features/character/classExplanation";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { yearlyProfile } from "@/features/chronicle/testing/fixtures";
import { createRPGCharacter } from "@/game/createCharacter";
import { analyzeLanguages } from "@/game/languages";
import { readmeBadgeMarkdown } from "@/features/badge/readmeMarkdown";
import { profileUrl } from "@/lib/profileUrl";
import { useUiStore } from "@/stores/useUiStore";
import { languagesFromShares, m } from "@/test/builders";
import { localizeAchievement } from "@/i18n/gameContent";
import CharacterPageClient from "./CharacterPageClient";

// The two share buttons are hidden in production; these tests exercise them with the flag on.
vi.mock("./shareActions", () => ({ SHARE_ACTIONS_ENABLED: true }));

const profile = yearlyProfile({
  createdAt: "2019-03-12T00:00:00Z",
  referenceDate: "2026-10-01T00:00:00Z",
  years: {
    2019: 40,
    2020: 180,
    2021: 200,
    2022: 190,
    2023: 342,
    2024: 610,
    2025: { contributions: 1300, commits: 521, pullRequests: 62, reviews: 31, issues: 4, activeDays: 250 },
    2026: 250,
  },
  overrides: {
    username: "artorias",
    displayName: "Artorias Silva",
    commits: m(1_200),
    ownRepositories: m(12),
    languages: languagesFromShares({ TypeScript: 59.6, HTML: 25.8, Python: 14.6 }, 6),
  },
});
const character = createRPGCharacter(profile);
const chronicle = buildDeveloperChronicle(profile);
const classExplanation = buildClassExplanation(character.archetype, analyzeLanguages(profile.languages), profile.languagesCoverage);

function renderPage() {
  return render(
    <CharacterPageClient character={character} chronicle={chronicle} classExplanation={classExplanation} username="artorias" />
  );
}

/** Installs (or removes) the browser APIs the share flows look at. */
function setBrowserApis(apis: { share?: unknown; clipboard?: unknown }) {
  Object.defineProperty(navigator, "share", { value: apis.share, configurable: true, writable: true });
  Object.defineProperty(navigator, "clipboard", { value: apis.clipboard, configurable: true, writable: true });
}

function stubCardFetch() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["png"], { type: "image/png" }) });
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn().mockReturnValue("blob:card");
  URL.revokeObjectURL = vi.fn();
  return fetchMock;
}

function badgeResponse(): Response {
  return new Response("<svg></svg>", { status: 200, headers: { "Content-Type": "image/svg+xml" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(badgeResponse()));
  // The Hero Card modal draws on a canvas, which jsdom does not implement.
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(
    new Proxy({}, { get: () => vi.fn().mockReturnValue({ addColorStop: vi.fn(), width: 100 }) })
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mocked");
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  setBrowserApis({});
  act(() => useUiStore.setState({ language: "pt-BR" }));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Why this class?", () => {
  it("opens a dialog that explains the class and the subclass with the real language figures", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Por que esta classe?" }));

    const dialog = screen.getByRole("dialog", { name: "Por que Mago?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("Sua linguagem principal é TypeScript.")).toBeInTheDocument();
    expect(within(dialog).getByText("TypeScript representa 59,6% dos bytes de linguagem analisados.")).toBeInTheDocument();
    expect(within(dialog).getByText("No GitHub RPG: TypeScript → Mago")).toBeInTheDocument();
    expect(within(dialog).getByText("HTML é sua próxima afinidade elegível.")).toBeInTheDocument();
    expect(within(dialog).getByText("No GitHub RPG: HTML → Bardo")).toBeInTheDocument();
    expect(within(dialog).getByText(/Não mede habilidade profissional/)).toBeInTheDocument();
  });

  it("is reachable and dismissible by keyboard, and gives focus back to its trigger", async () => {
    renderPage();
    const trigger = screen.getByRole("button", { name: "Por que esta classe?" });

    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("is explained in English too, with no Portuguese sentences", () => {
    act(() => useUiStore.setState({ language: "en" }));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Why this class?" }));

    const dialog = screen.getByRole("dialog", { name: "Why Mage?" });
    expect(within(dialog).getByText("Your main language is TypeScript.")).toBeInTheDocument();
    expect(within(dialog).getByText("TypeScript makes up 59.6% of the language bytes analysed.")).toBeInTheDocument();
    expect(within(dialog).getByText(/does not measure professional skill/)).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/linguagem|subclasse|Por isso/i);
  });
});

describe("Add to README", () => {
  it("prewarms the correct badge URL, then shows the badge and the ready-made Markdown", async () => {
    const fetchMock = vi.mocked(fetch);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao README" }));

    const dialog = screen.getByRole("dialog", { name: "Adicionar ao README" });
    expect(within(dialog).getByText("Preparando seu badge…")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copiar Markdown" })).toBeDisabled();
    await within(dialog).findByText("Badge pronto para o README.");
    expect(fetchMock).toHaveBeenCalledWith("/api/badge/artorias", expect.objectContaining({ credentials: "omit" }));
    expect(within(dialog).getByRole("img", { name: "Pré-visualização do badge" })).toHaveAttribute("src", "/api/badge/artorias");
    const markdown = within(dialog).getByRole("textbox", { name: "Markdown do badge" });
    expect(markdown).toHaveValue(readmeBadgeMarkdown("artorias"));
    expect(markdown).toHaveAttribute("readonly");
    expect((markdown as HTMLTextAreaElement).value).toMatch(/^\[!\[GitHub RPG\]\(.+\/api\/badge\/artorias\)\]\(.+\/artorias\)$/);
  });

  it("copies the Markdown and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ clipboard: { writeText } });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao README" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Copiar Markdown" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Copiar Markdown" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(readmeBadgeMarkdown("artorias")));
    expect(await screen.findByText("Markdown copiado!")).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((region) => region.textContent?.includes("Markdown copiado!"))).toBe(true);
  });

  it("says so, and keeps the text selectable, when copying is not possible", async () => {
    setBrowserApis({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    // No execCommand either: the last fallback fails too.
    document.execCommand = vi.fn().mockReturnValue(false);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao README" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Copiar Markdown" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Copiar Markdown" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível copiar");
    expect(screen.getByRole("textbox", { name: "Markdown do badge" })).toBeInTheDocument();
  });

  it("is translated", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ clipboard: { writeText } });
    act(() => useUiStore.setState({ language: "en" }));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Add to README" }));
    expect(screen.getByRole("dialog", { name: "Add to README" })).toBeInTheDocument();
    expect(await screen.findByText("Badge ready for your README.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Badge Markdown" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" }));

    expect(await screen.findByText("Markdown copied!")).toBeInTheDocument();
  });

  it("closes with Escape and returns focus to the button that opened it", async () => {
    renderPage();
    const trigger = screen.getByRole("button", { name: "Adicionar ao README" });
    trigger.focus();
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("shows a friendly prewarm error and succeeds when the user retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(badgeResponse());
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao README" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível preparar o badge agora");
    expect(alert).not.toHaveTextContent(/503|unavailable/i);
    expect(screen.getByRole("button", { name: "Copiar Markdown" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Badge pronto para o README.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar Markdown" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a slow prewarm responsive and does not claim readiness before the response completes", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao README" }));

    expect(screen.getByText("Preparando seu badge…")).toBeInTheDocument();
    expect(screen.getByText("Estamos preparando o badge com seus dados públicos do GitHub.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Markdown do badge" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar Markdown" })).toBeDisabled();

    resolveFetch(badgeResponse());

    expect(await screen.findByText("Badge pronto para o README.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Markdown do badge" })).toBeInTheDocument();
  });

  it("times out after 45 seconds and offers retry instead of spinning forever", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao README" }));
    expect(screen.getByText("Preparando seu badge…")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível preparar o badge agora");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Copiar Markdown" })).toBeDisabled();
  });

  it("reuses one in-flight prewarm when the modal is closed and opened again", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    const trigger = screen.getByRole("button", { name: "Adicionar ao README" });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(trigger);

    expect(screen.getByText("Preparando seu badge…")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch(badgeResponse());
    expect(await screen.findByText("Badge pronto para o README.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Share an achievement", () => {
  /** The card that opens the detail (the share action is a separate button with an aria-label of its own). */
  const cardButton = (name: string) =>
    screen.getAllByRole("button", { name: new RegExp(name) }).find((button) => !button.hasAttribute("aria-label"))!;
  const openAchievements = () => fireEvent.click(screen.getByRole("tab", { name: /Conquistas/i }));
  const unlocked = character.achievements.filter((a) => a.unlocked);
  const locked = character.achievements.filter((a) => !a.unlocked);

  it("offers the action only on UNLOCKED achievements", () => {
    renderPage();
    openAchievements();

    expect(unlocked.length).toBeGreaterThan(0);
    expect(locked.length).toBeGreaterThan(0);
    const shareLabels = screen
      .getAllByRole("button", { name: /^Compartilhar conquista:/ })
      .map((button) => button.getAttribute("aria-label"));

    expect(shareLabels).toEqual(unlocked.map((achievement) => `Compartilhar conquista: ${achievement.name}`));
    for (const achievement of locked) {
      expect(shareLabels).not.toContain(`Compartilhar conquista: ${achievement.name}`);
    }
  });

  it("loads the achievement's own card once, then shares the PROFILE link (V1 has no deep link)", async () => {
    const fetchMock = stubCardFetch();
    const share = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ share });
    renderPage();
    openAchievements();
    const target = unlocked[0];

    fireEvent.click(screen.getByRole("button", { name: `Compartilhar conquista: ${target.name}` }));

    const dialog = await screen.findByRole("dialog", { name: "Compartilhar conquista" });
    expect(await within(dialog).findByRole("img", { name: `Pré-visualização do cartão da conquista ${target.name}` })).toHaveAttribute("src", "blob:card");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/card/artorias/achievement/${target.id}`);

    fireEvent.click(within(dialog).getByRole("button", { name: "Compartilhar" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith({
      title: `${target.name} — GitHub RPG`,
      text: `artorias desbloqueou a conquista ${target.name} no GitHub RPG.`,
      url: profileUrl("artorias"),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the clipboard when the browser has no Web Share", async () => {
    stubCardFetch();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ clipboard: { writeText } });
    renderPage();
    openAchievements();
    fireEvent.click(screen.getByRole("button", { name: `Compartilhar conquista: ${unlocked[0].name}` }));
    const dialog = await screen.findByRole("dialog", { name: "Compartilhar conquista" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Compartilhar" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(profileUrl("artorias")));
    expect(await within(dialog).findByText("Link copiado!")).toBeInTheDocument();
  });

  it("shows the link to copy by hand when neither share nor clipboard works", async () => {
    stubCardFetch();
    setBrowserApis({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    document.execCommand = vi.fn().mockReturnValue(false);
    renderPage();
    openAchievements();
    fireEvent.click(screen.getByRole("button", { name: `Compartilhar conquista: ${unlocked[0].name}` }));
    const dialog = await screen.findByRole("dialog", { name: "Compartilhar conquista" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Compartilhar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Não foi possível compartilhar");
    expect(within(dialog).getByDisplayValue(profileUrl("artorias"))).toHaveAttribute("readonly");
  });

  it("downloads the same image under a safe, descriptive file name", async () => {
    stubCardFetch();
    let downloadName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });
    renderPage();
    openAchievements();
    const target = unlocked[0];
    fireEvent.click(screen.getByRole("button", { name: `Compartilhar conquista: ${target.name}` }));
    const dialog = await screen.findByRole("dialog", { name: "Compartilhar conquista" });
    await within(dialog).findByRole("img");

    fireEvent.click(within(dialog).getByRole("button", { name: "Baixar imagem" }));

    expect(downloadName).toBe(`github-rpg-artorias-achievement-${target.id}.png`);
  });

  it("explains a card that could not load, and offers no download for it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    renderPage();
    openAchievements();
    fireEvent.click(screen.getByRole("button", { name: `Compartilhar conquista: ${unlocked[0].name}` }));
    const dialog = await screen.findByRole("dialog", { name: "Compartilhar conquista" });

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Não foi possível carregar a imagem");
    expect(within(dialog).getByRole("button", { name: "Baixar imagem" })).toBeDisabled();
  });

  it("is also available from the achievement's detail, one dialog at a time", async () => {
    stubCardFetch();
    renderPage();
    openAchievements();
    const target = unlocked[0];

    fireEvent.click(cardButton(target.name));
    const detail = screen.getByRole("dialog", { name: target.name });
    fireEvent.click(within(detail).getByRole("button", { name: "Compartilhar conquista" }));

    expect(await screen.findByRole("dialog", { name: "Compartilhar conquista" })).toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("a locked achievement's detail has no share action", () => {
    renderPage();
    openAchievements();

    fireEvent.click(cardButton(locked[0].name));

    const detail = screen.getByRole("dialog", { name: locked[0].name });
    expect(within(detail).queryByRole("button", { name: "Compartilhar conquista" })).not.toBeInTheDocument();
  });

  it("is translated, and asks for the English card", async () => {
    const fetchMock = stubCardFetch();
    act(() => useUiStore.setState({ language: "en" }));
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Achievements/i }));
    const target = unlocked[0];
    const localizedTarget = localizeAchievement(target, "en");

    fireEvent.click(screen.getByRole("button", { name: `Share achievement: ${localizedTarget.name}` }));

    const dialog = await screen.findByRole("dialog", { name: "Share achievement" });
    expect(within(dialog).getByRole("button", { name: "Download image" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/card/artorias/achievement/${target.id}?lang=en`);
  });
});

describe("Share a Chronicle chapter", () => {
  it("offers the action on the chapters worth a card, in the preview", () => {
    renderPage();

    const buttons = screen.getAllByRole("button", { name: /^Compartilhar capítulo \d{4}:/ });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("loads that chapter's card, shares the profile and downloads it by year", async () => {
    const fetchMock = stubCardFetch();
    const share = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ share });
    let downloadName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });
    renderPage();

    const [first] = screen.getAllByRole("button", { name: /^Compartilhar capítulo \d{4}:/ });
    const year = /capítulo (\d{4}):/.exec(first.getAttribute("aria-label") ?? "")![1];
    fireEvent.click(first);

    const dialog = await screen.findByRole("dialog", { name: "Compartilhar capítulo" });
    await within(dialog).findByRole("img");
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/card/artorias/chronicle/${year}`);

    fireEvent.click(within(dialog).getByRole("button", { name: "Baixar imagem" }));
    expect(downloadName).toBe(`github-rpg-artorias-chronicle-${year}.png`);

    fireEvent.click(within(dialog).getByRole("button", { name: "Compartilhar" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].url).toBe(profileUrl("artorias"));
    expect(share.mock.calls[0][0].text).toContain(`capítulo ${year} da jornada de artorias`);
  });

  it("is also offered on the full timeline, for the same chapters only", () => {
    renderPage();
    const previewCount = screen.getAllByRole("button", { name: /^Compartilhar capítulo \d{4}:/ }).length;

    fireEvent.click(screen.getByRole("button", { name: /Ver toda a Crônica/i }));

    const fullCount = screen.getAllByRole("button", { name: /^Compartilhar capítulo \d{4}:/ }).length;
    expect(fullCount).toBeGreaterThanOrEqual(previewCount);
    // Never on every chapter: minor ones stay quiet.
    expect(fullCount).toBeLessThanOrEqual(chronicle.years.length);
  });

  it("is translated", async () => {
    const fetchMock = stubCardFetch();
    act(() => useUiStore.setState({ language: "en" }));
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: /^Share chapter \d{4}:/ })[0]);

    expect(await screen.findByRole("dialog", { name: "Share chapter" })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^\/api\/card\/artorias\/chronicle\/\d{4}\?lang=en$/);
  });

  it("closes with Escape and returns focus to the chapter's button", async () => {
    stubCardFetch();
    renderPage();
    const [button] = screen.getAllByRole("button", { name: /^Compartilhar capítulo \d{4}:/ });
    button.focus();
    fireEvent.click(button);
    await screen.findByRole("dialog", { name: "Compartilhar capítulo" });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });
});
