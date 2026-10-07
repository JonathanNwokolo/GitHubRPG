import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { timelineKind } from "@/features/chronicle/ChronicleTimelineFull";
import {
  ProfileActionButton,
  ProfileHeroPanel,
  ProfileMeter,
  ProfileSectionHeader,
  ProfileTimelineItem,
} from "./index";

describe("Profile UI Kit primitives", () => {
  it("ProfileMeter keeps the progressbar contract and clamps the fill", () => {
    render(<ProfileMeter value={150} max={100} aria-label="XP" />);
    const bar = screen.getByRole("progressbar", { name: "XP" });
    expect(bar).toHaveAttribute("aria-valuenow", "150");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("100%");
  });

  it("ProfileMeter never divides by zero", () => {
    render(<ProfileMeter value={5} max={0} aria-label="HP" />);
    expect((screen.getByRole("progressbar").firstElementChild as HTMLElement).style.width).toBe("0%");
  });

  it("ProfileSectionHeader: the title is a real heading in both variants, the ornament is decorative", () => {
    const { container, rerender } = render(<ProfileSectionHeader id="t" title="Atributos" subtitle="Escala" />);
    expect(screen.getByRole("heading", { level: 2, name: "Atributos" })).toHaveAttribute("id", "t");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(container.querySelector("img")).toHaveAttribute("aria-hidden", "true");

    rerender(<ProfileSectionHeader variant="quiet" title="Habilidades" />);
    expect(screen.getByRole("heading", { level: 2, name: "Habilidades" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("ProfileActionButton renders a link for href and a button otherwise, and forwards clicks", () => {
    const onClick = vi.fn();
    render(
      <>
        <ProfileActionButton href="/duel?opponent=octo" variant="duel">
          Desafiar
        </ProfileActionButton>
        <ProfileActionButton onClick={onClick}>Gerar</ProfileActionButton>
      </>,
    );
    expect(screen.getByRole("link", { name: "Desafiar" })).toHaveAttribute("href", "/duel?opponent=octo");
    expect(screen.getByRole("link", { name: "Desafiar" }).className).toContain("pf-btn--duel");
    fireEvent.click(screen.getByRole("button", { name: "Gerar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ProfileHeroPanel hides every decorative piece from assistive technology", () => {
    const { container } = render(
      <ProfileHeroPanel aria-label="Herói">
        <h1>Nome</h1>
      </ProfileHeroPanel>,
    );
    expect(screen.getByRole("heading", { name: "Nome" })).toBeInTheDocument();
    const decorations = container.querySelectorAll(".pf-hero__edge, .pf-hero__sprite");
    expect(decorations.length).toBe(7);
    decorations.forEach((node) => expect(node).toHaveAttribute("aria-hidden", "true"));
  });

  it("ProfileTimelineItem marks first/last and the kind, and keeps the date and the content once", () => {
    const { container } = render(
      <ol>
        <ProfileTimelineItem kind="current" isFirst isLast index={0} year={<span>2026</span>}>
          <p>Capítulo atual</p>
        </ProfileTimelineItem>
      </ol>,
    );
    const item = container.querySelector("li");
    expect(item?.className).toContain("pf-tl--current");
    expect(item?.className).toContain("pf-tl--first");
    expect(item?.className).toContain("pf-tl--last");
    expect(screen.getAllByText("2026")).toHaveLength(1);
    expect(container.querySelector(".pf-tl__rail")).toHaveAttribute("aria-hidden", "true");
  });

  it("maps Chronicle entries to markers using only what the Chronicle already decided", () => {
    expect(timelineKind({ isCurrent: true, rarity: "exceptional" })).toBe("current");
    expect(timelineKind({ isCurrent: false, rarity: "important" })).toBe("important");
    expect(timelineKind({ isCurrent: false, rarity: "exceptional" })).toBe("important");
    expect(timelineKind({ isCurrent: false, rarity: "normal" })).toBe("common");
  });
});
