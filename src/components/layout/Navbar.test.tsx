import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Navbar } from "./Navbar";
import { useUiStore } from "@/stores/useUiStore";

// Mock next/navigation
const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

afterEach(() => {
  act(() => {
    useUiStore.setState({ language: "pt-BR", audioEnabled: false });
  });
  mockPathname.mockReturnValue("/");
});

describe("Navbar", () => {
  it("renders the brand logo and tagline in Portuguese by default", () => {
    render(<Navbar isDemo={false} />);
    expect(screen.getByText("GitHub RPG")).toBeInTheDocument();
    expect(screen.getByText("Ficha Rúnica de Herói")).toBeInTheDocument();
  });

  it("renders the tagline in English when language is switched", () => {
    render(<Navbar isDemo={false} />);
    act(() => {
      useUiStore.getState().setLanguage("en");
    });
    expect(screen.getByText("Runic Hero Sheet")).toBeInTheDocument();
  });

  it("renders all main navigation tabs", () => {
    render(<Navbar isDemo={false} />);
    const desktopNav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(desktopNav).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Início/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Salão/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Duelo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Configurações/i })).toBeInTheDocument();
  });

  it("marks active page with aria-current='page'", () => {
    mockPathname.mockReturnValue("/duel");
    render(<Navbar isDemo={false} />);
    const duelLink = screen.getByRole("link", { name: /Duelo/i });
    expect(duelLink).toHaveAttribute("aria-current", "page");

    const homeLink = screen.getByRole("link", { name: /Início/i });
    expect(homeLink).not.toHaveAttribute("aria-current");
  });

  it("toggles audio when audio button is clicked", () => {
    render(<Navbar isDemo={false} />);
    expect(useUiStore.getState().audioEnabled).toBe(false);

    const soundBtn = screen.getByRole("button", { name: /Ativar efeitos sonoros/i });
    act(() => {
      fireEvent.click(soundBtn);
    });
    expect(useUiStore.getState().audioEnabled).toBe(true);

    const activeSoundBtn = screen.getByRole("button", { name: /Desativar efeitos sonoros/i });
    act(() => {
      fireEvent.click(activeSoundBtn);
    });
    expect(useUiStore.getState().audioEnabled).toBe(false);
  });

  it("changes language using the segmented PT/EN switch", () => {
    render(<Navbar isDemo={false} />);
    const enBtns = screen.getAllByRole("button", { name: /Switch to English/i });
    act(() => {
      fireEvent.click(enBtns[0]);
    });
    expect(useUiStore.getState().language).toBe("en");

    const ptBtns = screen.getAllByRole("button", { name: /Switch to Portuguese|Mudar para Português/i });
    act(() => {
      fireEvent.click(ptBtns[0]);
    });
    expect(useUiStore.getState().language).toBe("pt-BR");
  });

  it("toggles the mobile drawer when clicking the hamburger button", () => {
    render(<Navbar isDemo={false} />);
    const menuToggle = screen.getByRole("button", { name: /Abrir menu/i });
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");

    act(() => {
      fireEvent.click(menuToggle);
    });
    expect(menuToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Fechar menu/i })).toBeInTheDocument();

    // Clicking a mobile nav link closes the menu
    const mobileLinks = screen.getAllByRole("link", { name: /Salão/i });
    act(() => {
      fireEvent.click(mobileLinks[mobileLinks.length - 1]);
    });
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
  });

  it("displays demo data indicator when isDemo is true", () => {
    render(<Navbar isDemo={true} />);
    expect(screen.getByText("Dados de demonstração")).toBeInTheDocument();
  });
});
