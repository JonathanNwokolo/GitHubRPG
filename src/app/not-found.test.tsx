import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";
import { useUiStore } from "@/stores/useUiStore";

afterEach(() => {
  useUiStore.setState({ language: "pt-BR" });
});

describe("not-found", () => {
  it("keeps the 404 heading and a link home, in Portuguese", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("404 - Território Inexplorado");
    expect(screen.getByRole("link", { name: /Retornar à Taverna/ })).toHaveAttribute("href", "/");
  });

  it("follows the interface language", () => {
    useUiStore.setState({ language: "en" });
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("404 - Uncharted Territory");
    expect(screen.getByRole("link", { name: /Return to the Tavern/ })).toHaveAttribute("href", "/");
  });
});
