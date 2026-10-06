import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TabPanel, Tabs } from "./Tabs";

const items = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "titles", label: "Titles" },
];

function renderTabs(activeTab = "skills", onTabChange = vi.fn()) {
  render(
    <>
      <Tabs idPrefix="sheet" items={items} activeTab={activeTab} onTabChange={onTabChange} aria-label="Sheet sections" />
      <TabPanel idPrefix="sheet" tabId={activeTab}>
        panel content
      </TabPanel>
    </>
  );
  return onTabChange;
}

describe("Tabs <-> TabPanel semantics", () => {
  it("exposes a named tablist, tabs and exactly one selected tab", () => {
    renderTabs("skills");

    expect(screen.getByRole("tablist", { name: "Sheet sections" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs.filter((tab) => tab.getAttribute("aria-selected") === "true")).toEqual([
      screen.getByRole("tab", { name: "Skills" }),
    ]);
  });

  it("links the selected tab and its panel in both directions", () => {
    renderTabs("skills");

    const tab = screen.getByRole("tab", { name: "Skills" });
    const panel = screen.getByRole("tabpanel");

    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
    expect(panel).toHaveAccessibleName("Skills");
  });

  it("never points aria-controls at an element that does not exist", () => {
    renderTabs("skills");

    for (const tab of screen.getAllByRole("tab")) {
      const controls = tab.getAttribute("aria-controls");
      if (controls) expect(document.getElementById(controls)).not.toBeNull();
    }
    // Inactive tabs have no panel mounted, so they do not claim one.
    expect(screen.getByRole("tab", { name: "Overview" })).not.toHaveAttribute("aria-controls");
    expect(screen.getByRole("tab", { name: "Titles" })).not.toHaveAttribute("aria-controls");
  });

  it("uses unique ids for two tab lists on the same page", () => {
    render(
      <>
        <Tabs items={items} activeTab="overview" onTabChange={() => {}} />
        <Tabs items={items} activeTab="overview" onTabChange={() => {}} />
      </>
    );

    const ids = screen.getAllByRole("tab").map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only the selected tab is in the tab order (roving tabindex)", () => {
    renderTabs("skills");

    expect(screen.getByRole("tab", { name: "Skills" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the arrow / Home / End keyboard navigation", () => {
    const onTabChange = renderTabs("skills");
    const skills = screen.getByRole("tab", { name: "Skills" });

    fireEvent.keyDown(skills, { key: "ArrowRight" });
    expect(onTabChange).toHaveBeenLastCalledWith("titles");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Titles" }));

    fireEvent.keyDown(skills, { key: "ArrowLeft" });
    expect(onTabChange).toHaveBeenLastCalledWith("overview");

    fireEvent.keyDown(skills, { key: "End" });
    expect(onTabChange).toHaveBeenLastCalledWith("titles");

    fireEvent.keyDown(skills, { key: "Home" });
    expect(onTabChange).toHaveBeenLastCalledWith("overview");
  });

  it("changes tab on click", () => {
    const onTabChange = renderTabs("skills");

    fireEvent.click(screen.getByRole("tab", { name: "Titles" }));
    expect(onTabChange).toHaveBeenCalledWith("titles");
  });
});
