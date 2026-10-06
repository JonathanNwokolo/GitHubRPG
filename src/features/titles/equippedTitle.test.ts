import { describe, expect, it } from "vitest";
import type { TitleProgress } from "@/game/types";
import { resolveEquippedTitle } from "./equippedTitle";

const title = (id: string, unlocked: boolean): TitleProgress => ({
  kind: "combination",
  id,
  name: id,
  description: "",
  category: "class",
  unlocked,
  requirements: [],
});

const titles = [title("a", true), title("b", true), title("c", false)];

describe("resolveEquippedTitle", () => {
  it("uses the saved pick when it is unlocked", () => {
    expect(resolveEquippedTitle(titles, "b", "a")?.id).toBe("b");
  });

  it("falls back to the engine default when nothing is saved", () => {
    expect(resolveEquippedTitle(titles, undefined, "a")?.id).toBe("a");
  });

  it("ignores a saved pick that is locked or no longer exists", () => {
    expect(resolveEquippedTitle(titles, "c", "a")?.id).toBe("a");
    expect(resolveEquippedTitle(titles, "gone", "a")?.id).toBe("a");
  });

  it("is null when there is neither a valid pick nor a default", () => {
    expect(resolveEquippedTitle(titles, undefined, null)).toBeNull();
    expect(resolveEquippedTitle([title("c", false)], "c", "c")).toBeNull();
  });
});
