import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ThresholdTitleProgress } from "@/game/types";
import { useUiStore } from "@/stores/useUiStore";
import { TitlesPanel } from "./TitlesPanel";

const title: ThresholdTitleProgress = {
  kind: "threshold",
  id: "title-stars-1000",
  name: "Lenda Celestial",
  description: "1.000+ estrelas recebidas",
  category: "reputation",
  isNext: false,
  unit: "stars",
  target: 1_000,
  current: 1_000,
  unlocked: true,
  progressPercent: 100,
  remaining: 0,
  coverage: "full",
};

function renderPanel() {
  return render(
    <TitlesPanel
      titles={[title]}
      equippedTitleId={title.id}
      defaultTitleId={title.id}
      hasCustomPick={false}
      onEquip={vi.fn()}
      onUseDefault={vi.fn()}
    />
  );
}

afterEach(() => useUiStore.setState({ language: "pt-BR" }));

describe("TitlesPanel localization", () => {
  it("renders the canonical title in Portuguese", () => {
    useUiStore.setState({ language: "pt-BR" });
    renderPanel();
    expect(screen.getByText("Lenda Celestial")).toBeInTheDocument();
    expect(screen.getByText("1.000+ estrelas recebidas")).toBeInTheDocument();
  });

  it("renders the title in English", () => {
    useUiStore.setState({ language: "en" });
    renderPanel();
    expect(screen.getByText("Celestial Legend")).toBeInTheDocument();
    expect(screen.getByText("1,000+ stars received")).toBeInTheDocument();
    expect(screen.queryByText("Lenda Celestial")).not.toBeInTheDocument();
  });
});
