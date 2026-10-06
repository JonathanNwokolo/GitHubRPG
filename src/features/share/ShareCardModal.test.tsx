import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShareCardModal } from "./ShareCardModal";
import { createRPGCharacter } from "@/game/createCharacter";
import { makeAverageProfile, makeProfile } from "@/test/builders";

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

describe("ShareCardModal", () => {
  it("renders canvas and download button when open", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const onClose = vi.fn();

    render(
      <ShareCardModal
        isOpen={true}
        onClose={onClose}
        character={character}
        equippedTitleName="Cavaleiro do Abismo"
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baixar como PNG/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar Link/i })).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    const character = createRPGCharacter(makeAverageProfile());
    const onClose = vi.fn();

    render(
      <ShareCardModal
        isOpen={false}
        onClose={onClose}
        character={character}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles empty profile without crashing", () => {
    const character = createRPGCharacter(makeProfile({ username: "empty-dev", languages: [] }));
    const onClose = vi.fn();

    render(
      <ShareCardModal
        isOpen={true}
        onClose={onClose}
        character={character}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baixar como PNG/i })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const character = createRPGCharacter(makeAverageProfile());
    const onClose = vi.fn();

    render(
      <ShareCardModal
        isOpen={true}
        onClose={onClose}
        character={character}
      />
    );

    const closeButtons = screen.getAllByRole("button", { name: /Fechar/i });
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
