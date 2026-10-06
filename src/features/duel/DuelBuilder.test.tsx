import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/useUiStore";
import { DuelBuilder } from "./DuelBuilder";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("DuelBuilder", () => {
  beforeEach(() => {
    push.mockReset();
    useUiStore.setState({ language: "pt-BR" });
  });

  it("accepts a username and GitHub URL, then navigates to the shareable duel", () => {
    render(<DuelBuilder />);
    fireEvent.change(screen.getByLabelText("Herói 1"), { target: { value: "JonathanNwokolo" } });
    fireEvent.change(screen.getByLabelText("Herói 2"), { target: { value: "https://github.com/ahejlsberg" } });
    fireEvent.click(screen.getByRole("button", { name: /Iniciar duelo/i }));
    expect(push).toHaveBeenCalledWith("/duel/jonathannwokolo/vs/ahejlsberg");
  });

  it("prefills a challenged hero without starting a battle", () => {
    render(<DuelBuilder initialHeroA="ahejlsberg" />);
    expect(screen.getByLabelText("Herói 1")).toHaveValue("ahejlsberg");
    expect(screen.getByLabelText("Herói 2")).toHaveValue("");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows independent validation errors and rejects self-duels", () => {
    render(<DuelBuilder />);
    fireEvent.click(screen.getByRole("button", { name: /Iniciar duelo/i }));
    expect(screen.getAllByText("Informe um username válido do GitHub.")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Herói 1"), { target: { value: "same-user" } });
    fireEvent.change(screen.getByLabelText("Herói 2"), { target: { value: "SAME-USER" } });
    fireEvent.click(screen.getByRole("button", { name: /Iniciar duelo/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha dois heróis diferentes.");
    expect(push).not.toHaveBeenCalled();
  });

  it("renders the complete builder in English", () => {
    useUiStore.setState({ language: "en" });
    render(<DuelBuilder />);
    expect(screen.getByRole("heading", { name: "Heroes' Duel" })).toBeVisible();
    expect(screen.getByLabelText("Hero 1")).toBeVisible();
    expect(screen.getByLabelText("Hero 2")).toBeVisible();
  });
});

