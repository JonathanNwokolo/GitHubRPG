import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AchievementProgress } from "@/game/types";
import { useUiStore } from "@/stores/useUiStore";
import { NextMilestones } from "./NextMilestones";

const milestone: AchievementProgress = {
  id: "issues-10",
  name: "Caçador de Bugs",
  description: "Abra 10 issues.",
  rarity: "common",
  category: "issues",
  unit: "issues",
  target: 10,
  current: 3,
  unlocked: false,
  progressPercent: 30,
  remaining: 7,
  coverage: "full",
};

afterEach(() => useUiStore.setState({ language: "pt-BR" }));

describe("NextMilestones localization", () => {
  it("renders the canonical milestone in Portuguese", () => {
    useUiStore.setState({ language: "pt-BR" });
    render(<NextMilestones milestones={[milestone]} />);
    expect(screen.getByText("Caçador de Bugs")).toBeInTheDocument();
    expect(screen.getByText("Abra 10 issues.")).toBeInTheDocument();
  });

  it("renders the same milestone in English without changing its id", () => {
    useUiStore.setState({ language: "en" });
    render(<NextMilestones milestones={[milestone]} />);
    expect(screen.getByText("Bug Hunter")).toBeInTheDocument();
    expect(screen.getByText("Open 10 issues.")).toBeInTheDocument();
    expect(screen.queryByText("Caçador de Bugs")).not.toBeInTheDocument();
  });
});
