import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AchievementProgress } from "@/game/types";
import { useUiStore } from "@/stores/useUiStore";
import { AchievementsGrid } from "./AchievementsGrid";

const achievement: AchievementProgress = {
  id: "languages-5",
  name: "Poliglota",
  description: "Use 5 linguagens relevantes.",
  rarity: "rare",
  category: "languages",
  unit: "languages",
  target: 5,
  current: 3,
  unlocked: false,
  progressPercent: 60,
  remaining: 2,
  coverage: "full",
};

afterEach(() => useUiStore.setState({ language: "pt-BR" }));

describe("AchievementsGrid localization", () => {
  it("renders the canonical achievement in Portuguese", () => {
    useUiStore.setState({ language: "pt-BR" });
    render(<AchievementsGrid achievements={[achievement]} />);
    expect(screen.getByText("Poliglota")).toBeInTheDocument();
    expect(screen.getByText("Use 5 linguagens relevantes.")).toBeInTheDocument();
  });

  it("renders the achievement in English", () => {
    useUiStore.setState({ language: "en" });
    render(<AchievementsGrid achievements={[achievement]} />);
    expect(screen.getByText("Polyglot")).toBeInTheDocument();
    expect(screen.getByText("Use 5 relevant languages.")).toBeInTheDocument();
    expect(screen.queryByText("Poliglota")).not.toBeInTheDocument();
  });
});
