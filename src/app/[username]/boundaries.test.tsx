import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useUiStore } from "@/stores/useUiStore";
import { CharacterLoading } from "./CharacterLoading";
import CharacterError from "./error";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/torvalds",
}));

beforeEach(() => {
  refresh.mockReset();
});

afterEach(() => {
  useUiStore.setState({ language: "pt-BR" });
});

describe("route boundaries of /[username]", () => {
  it("has an error boundary and a themed loading fallback next to the page", () => {
    expect(existsSync(resolve(__dirname, "error.tsx"))).toBe(true);
    expect(existsSync(resolve(__dirname, "CharacterLoading.tsx"))).toBe(true);
    expect(existsSync(resolve(__dirname, "page.tsx"))).toBe(true);
  });

  it("the loading state is a <Suspense> fallback inside the page, NOT a loading.tsx file", () => {
    // A loading.tsx makes Next stream the response before the page runs, so notFound() can no longer
    // set the HTTP status: unknown users would answer 200 instead of 404 (verified on Next 15.5).
    expect(existsSync(resolve(__dirname, "loading.tsx"))).toBe(false);
    expect(readFileSync(resolve(__dirname, "page.tsx"), "utf8")).toMatch(/<Suspense\s+fallback=\{<CharacterLoading/);
  });
});

describe("CharacterLoading", () => {
  it("announces loading politely and shows a skeleton, not data", () => {
    const { container } = render(<CharacterLoading />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Consultando os oráculos do código...");
    // No invented level, name or numbers: the skeleton carries no digits at all.
    expect(container.textContent).not.toMatch(/\d/);
    expect(container.textContent).not.toMatch(/n[ií]vel|level|xp/i);
  });

  it("follows the interface language", () => {
    useUiStore.setState({ language: "en" });
    render(<CharacterLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Consulting the code oracles...");
  });
});

describe("error.tsx", () => {
  const failure = Object.assign(new Error("GitHub GraphQL 502 ECONNRESET token=ghp_SECRET {\"errors\":[]}"), {
    digest: "dg-1234",
    stack: "Error: leaked\n    at secretFunction (/srv/app/secret.ts:1:1)",
  });

  it("shows a friendly message with a retry action and a way back to the landing", () => {
    render(<CharacterError error={failure} reset={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Os oráculos não responderam");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
  });

  it("never shows the raw error: no message, stack, JSON or token", () => {
    const { container } = render(<CharacterError error={failure} reset={vi.fn()} />);

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/ECONNRESET|GraphQL|ghp_|SECRET|secretFunction|leaked|"errors"|\{|\}/);
    // Only the opaque digest is shown, as a reference for the logs.
    expect(text).toContain("dg-1234");
  });

  it("retry refreshes the server render and resets the boundary", () => {
    const reset = vi.fn();
    render(<CharacterError error={failure} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("is available in English", () => {
    useUiStore.setState({ language: "en" });
    render(<CharacterError error={failure} reset={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
