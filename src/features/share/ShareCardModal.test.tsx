import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareCardModal } from "./ShareCardModal";
import { createRPGCharacter } from "@/game/createCharacter";
import { makeAverageProfile, makeProfile } from "@/test/builders";
import { profileUrl } from "@/lib/profileUrl";
import { useUiStore } from "@/stores/useUiStore";

// Mock HTMLCanvasElement.getContext
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    arc: vi.fn(),
    drawImage: vi.fn(),
    closePath: vi.fn(),
    quadraticCurveTo: vi.fn(),
    roundRect: vi.fn(),
    textAlign: "left",
    font: "12px monospace",
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mocked");
});

/** Installs (or removes) the browser APIs the share flow looks at. */
function setBrowserApis(apis: { share?: unknown; clipboard?: unknown }) {
  Object.defineProperty(navigator, "share", { value: apis.share, configurable: true, writable: true });
  Object.defineProperty(navigator, "clipboard", { value: apis.clipboard, configurable: true, writable: true });
}

afterEach(() => {
  setBrowserApis({});
  useUiStore.setState({ language: "pt-BR" });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderModal(username = "artorias", onClose = vi.fn()) {
  const character = createRPGCharacter(makeAverageProfile({ username }));
  render(<ShareCardModal isOpen onClose={onClose} character={character} equippedTitleName="Cavaleiro do Abismo" />);
  return { character, onClose };
}

describe("ShareCardModal", () => {
  it("renders canvas, share-profile and download-card buttons when open", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Pré-visualização do Cartão de Herói/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartilhar perfil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar Cartão de Herói" })).toBeInTheDocument();
    // The old "copy the image URL" action is gone: sharing is about the profile.
    expect(screen.queryByRole("button", { name: /Copiar Link/i })).not.toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    const character = createRPGCharacter(makeAverageProfile());
    render(<ShareCardModal isOpen={false} onClose={vi.fn()} character={character} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles empty profile without crashing", () => {
    const character = createRPGCharacter(makeProfile({ username: "empty-dev", languages: [] }));
    render(<ShareCardModal isOpen onClose={vi.fn()} character={character} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar Cartão de Herói" })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const { onClose } = renderModal();

    const closeButtons = screen.getAllByRole("button", { name: /Fechar/i });
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("names the dialog and labels its close button in the interface language", () => {
    useUiStore.setState({ language: "en" });
    renderModal();

    expect(screen.getByRole("dialog", { name: "Adventurer Card" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Hero Card" })).toBeInTheDocument();
  });
});

describe("ShareCardModal: share profile", () => {
  it("uses the Web Share API with the profile URL (not the card image URL)", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ share, clipboard: { writeText } });
    renderModal("artorias");

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar perfil" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith({
      title: "artorias — GitHub RPG",
      text: "Veja o personagem de artorias no GitHub RPG.",
      url: profileUrl("artorias"),
    });
    expect(share.mock.calls[0][0].url).not.toContain("/api/card/");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("shares in English when the interface is English", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ share });
    useUiStore.setState({ language: "en" });
    renderModal("artorias");

    fireEvent.click(screen.getByRole("button", { name: "Share profile" }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0]).toMatchObject({ text: "Check out artorias's character on GitHub RPG." });
  });

  it("copies the profile URL and says so when the Web Share API is not available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ clipboard: { writeText } });
    renderModal("artorias");

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar perfil" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(profileUrl("artorias")));
    expect(await screen.findByText("Link copiado!")).toBeInTheDocument();
  });

  it("says 'Link copied!' in English", async () => {
    setBrowserApis({ clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    useUiStore.setState({ language: "en" });
    renderModal("artorias");

    fireEvent.click(screen.getByRole("button", { name: "Share profile" }));

    expect(await screen.findByText("Link copied!")).toBeInTheDocument();
  });

  it("treats the person dismissing the share sheet as a normal outcome: no error, no copy", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("Share canceled"), { name: "AbortError" }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ share, clipboard: { writeText } });
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar perfil" }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartilhar perfil" })).toBeEnabled());
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Link copiado!")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to copying the link when the share sheet fails for another reason", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("boom"), { name: "NotAllowedError" }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    setBrowserApis({ share, clipboard: { writeText } });
    renderModal("artorias");

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar perfil" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(profileUrl("artorias")));
    expect(await screen.findByText("Link copiado!")).toBeInTheDocument();
  });

  it("shows the link to copy by hand when neither share nor clipboard works, without breaking the UI", async () => {
    setBrowserApis({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    renderModal("artorias");

    fireEvent.click(screen.getByRole("button", { name: "Compartilhar perfil" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível compartilhar");
    expect(screen.getByDisplayValue(profileUrl("artorias"))).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Baixar Cartão de Herói" })).toBeEnabled();
  });
});

describe("ShareCardModal: download", () => {
  it("still downloads the PNG card from the card API", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    vi.stubGlobal("fetch", fetchMock);
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderModal("artorias");

    fireEvent.click(screen.getByRole("button", { name: "Baixar Cartão de Herói" }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/card/artorias?title=Cavaleiro%20do%20Abismo");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
