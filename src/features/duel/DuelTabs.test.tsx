import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/useUiStore";
import { DuelTabs } from "./DuelTabs";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("DuelTabs", () => {
  beforeEach(() => {
    useUiStore.setState({ language: "pt-BR" });
  });

  it("renders the empty arena when no active confrontation exists and allows switching back to builder", () => {
    render(<DuelTabs />);

    // Default tab is 'build' when no arena is provided
    expect(screen.getByRole("heading", { name: "Duelo de Heróis" })).toBeInTheDocument();

    // Switch to 'current' tab
    fireEvent.click(screen.getByRole("tab", { name: "Duelo atual" }));

    // Empty arena state is rendered
    expect(screen.getByRole("heading", { name: /A Arena Aguarda Combatentes/i })).toBeInTheDocument();
    expect(screen.getByText(/Nenhum duelo está em andamento/i)).toBeInTheDocument();

    // Click CTA to summon heroes and return to build tab
    fireEvent.click(screen.getByRole("button", { name: /Convocar Heróis para a Arena/i }));
    expect(screen.getByLabelText("Herói 1")).toBeInTheDocument();
  });

  it("renders the active arena when provided", () => {
    render(<DuelTabs arena={<div data-testid="active-arena">Epic Clash Underway</div>} />);

    // When arena is provided, active tab defaults to 'current'
    expect(screen.getByTestId("active-arena")).toHaveTextContent("Epic Clash Underway");
  });
});
