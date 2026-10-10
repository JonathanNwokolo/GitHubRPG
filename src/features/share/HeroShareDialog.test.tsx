import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useUiStore } from "@/stores/useUiStore";
import { HeroShareDialog } from "./HeroShareDialog";

const SHEET_URL = "http://localhost:3000/artorias";

function pngResponse(): Response {
  return new Response(new Blob(["png"], { type: "image/png" }), { status: 200, headers: { "Content-Type": "image/png" } });
}

function Harness(props: Partial<React.ComponentProps<typeof HeroShareDialog>> = {}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        abrir
      </button>
      {open && (
        <HeroShareDialog
          isOpen
          onClose={() => setOpen(false)}
          username="Artorias"
          heroClassName="Mago"
          level={26}
          title="Guardião Arcano"
          titleId="title-years-5"
          {...props}
        />
      )}
    </>
  );
}

async function openDialog() {
  const trigger = screen.getByRole("button", { name: "abrir" });
  trigger.focus();
  // Async act: the card request resolves in a microtask right after the click.
  await act(async () => {
    fireEvent.click(trigger);
  });
  return trigger;
}

let fetchMock: ReturnType<typeof vi.fn>;
const writeText = vi.fn();

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async () => pngResponse());
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn().mockReturnValue("blob:card");
  URL.revokeObjectURL = vi.fn();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true, writable: true });
});

afterEach(async () => {
  // Let the card request settle inside act() before the tree is torn down.
  await act(async () => undefined);
  cleanup();
  useUiStore.setState({ language: "pt-BR" });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HeroShareDialog", () => {
  it("opens as a modal dialog named after the feature", async () => {
    render(<Harness />);
    await openDialog();

    const dialog = await screen.findByRole("dialog", { name: "Compartilhar Herói" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Carta Social do Herói em 4:5, pronta para o LinkedIn e outras redes.")).toBeInTheDocument();
  });

  it("fetches the card once for the interface language and the equipped title, and previews that image", async () => {
    render(<Harness />);
    await openDialog();

    const preview = await screen.findByRole("img", { name: /Pré-visualização da Carta Social do Herói de Artorias/ });
    expect(preview).toHaveAttribute("src", "blob:card");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/card/artorias/social?title=title-years-5");
  });

  it("asks for the English card and speaks English", async () => {
    useUiStore.setState({ language: "en" });
    render(<Harness />);
    await openDialog();

    await screen.findByRole("img", { name: /Preview of the Hero Social Card of Artorias/ });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/card/artorias/social?lang=en&title=title-years-5");
    expect(screen.getByRole("dialog", { name: "Share Hero" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy post" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share on LinkedIn" })).toBeInTheDocument();
  });

  it("downloads the very image it previews, under a safe file name", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<Harness />);
    await openDialog();
    await screen.findByRole("img", { name: /Pré-visualização/ });

    fireEvent.click(screen.getByRole("button", { name: "Baixar PNG" }));

    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("github-rpg-Artorias.png");
    expect(anchor.getAttribute("href")).toBe("blob:card");
    expect(fetchMock).toHaveBeenCalledTimes(1); // no second request for the download
  });

  it("keeps the download disabled until the card is ready", async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    render(<Harness />);
    await openDialog();

    expect(await screen.findByText("Forjando a carta...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar PNG" })).toBeDisabled();
  });

  it("copies the link of the character sheet and says so politely", async () => {
    render(<Harness />);
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SHEET_URL));
    const status = await screen.findByText("Link copiado");
    expect(status.closest("[aria-live='polite']")).not.toBeNull();
  });

  it("copies the post text with class, level, title and link", async () => {
    render(<Harness />);
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Copiar texto" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Transformei meu perfil do GitHub em um personagem de RPG.");
    expect(text).toContain("Classe: Mago");
    expect(text).toContain("Nível: 26");
    expect(text).toContain("Título: Guardião Arcano");
    expect(text).toContain(SHEET_URL);
    expect(await screen.findByText("Texto copiado")).toBeInTheDocument();
  });

  it("leaves the level and title out of the post when there are none", async () => {
    render(<Harness level={null} title={null} />);
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Copiar texto" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).not.toContain("Nível");
    expect(text).not.toContain("Título");
    expect(text).toContain("Classe: Mago");
  });

  it("offers the text to copy by hand when the clipboard is not available", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true, writable: true });
    document.execCommand = vi.fn().mockReturnValue(false);
    render(<Harness />);
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    const field = await screen.findByRole("textbox", { name: "Link da ficha" });
    expect(field).toHaveValue(SHEET_URL);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível copiar automaticamente");
  });

  it("opens LinkedIn's official share flow with the sheet link, in a new tab, and says the PNG is attached by hand", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<Harness />);
    await openDialog();
    await screen.findByRole("img", { name: /Pré-visualização/ });

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar no LinkedIn" }));

    expect(open).toHaveBeenCalledWith(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHEET_URL)}`,
      "_blank",
      "noopener,noreferrer"
    );
    expect(screen.getByText(/a imagem não é enviada automaticamente/)).toBeInTheDocument();
  });

  it("explains a sheet that cannot be shared and offers no download", async () => {
    fetchMock.mockImplementation(async () => new Response("partial", { status: 503, headers: { "Cache-Control": "no-store" } }));
    render(<Harness />);
    await openDialog();

    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent("O compartilhamento não está disponível para esta ficha no momento");
    expect(screen.getByRole("button", { name: "Baixar PNG" })).toBeDisabled();
    expect(screen.queryByRole("img", { name: /Pré-visualização/ })).toBeNull();
  });

  it("tells a sheet that is still being prepared apart, and lets the visitor retry", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("wait", { status: 503, headers: { "Retry-After": "5" } }));
    render(<Harness />);
    await openDialog();

    expect(await screen.findByRole("alert")).toHaveTextContent("A ficha ainda está sendo preparada");

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("img", { name: /Pré-visualização/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a friendly message, not the raw error, when the request fails", async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error("ECONNRESET secret-detail");
    });
    render(<Harness />);
    await openDialog();

    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent("Não foi possível gerar a carta agora");
    expect(message).not.toHaveTextContent("ECONNRESET");
  });

  it("closes with Escape and returns focus to the button that opened it", async () => {
    render(<Harness />);
    const trigger = await openDialog();
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes with the close button", async () => {
    render(<Harness />);
    await openDialog();
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Fechar janela" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps Tab inside the dialog", async () => {
    render(<Harness />);
    await openDialog();
    const dialog = await screen.findByRole("dialog");
    await screen.findByRole("img", { name: /Pré-visualização/ });

    const buttons = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled])"));
    const last = buttons[buttons.length - 1];
    act(() => last.focus());
    fireEvent.keyDown(document, { key: "Tab" });

    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("revokes the preview URL when it closes", async () => {
    render(<Harness />);
    await openDialog();
    await screen.findByRole("img", { name: /Pré-visualização/ });

    fireEvent.click(screen.getByRole("button", { name: "Fechar janela" }));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:card"));
  });
});
