// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { GitHubDataSource } from "./contracts";
import { loadCharacter, loadCharacterWithChronicle } from "./loadCharacter";
import { MockDataSource } from "./datasource/MockDataSource";

/** A source that counts how many times the profile is fetched (stands in for GitHub requests). */
function countingSource() {
  const inner = new MockDataSource();
  const getProfile = vi.fn((username: string) => inner.getProfile(username));
  const source: GitHubDataSource = { kind: "mock", getProfile };
  return { source, getProfile };
}

describe("loadCharacterWithChronicle", () => {
  it("returns the class explanation, the Chronicle and the character from ONE profile fetch", async () => {
    const { source, getProfile } = countingSource();

    const { character, chronicle, classExplanation } = await loadCharacterWithChronicle("veteran-dev", source);

    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(chronicle.adventurerName).toBeTruthy();
    expect(classExplanation.className).toBe(character.archetype.className);
    expect(classExplanation.dominant?.language).toBe(character.archetype.dominantLanguage);
    expect(classExplanation.subclass?.className).toBe(character.archetype.subclassName);
  });

  it("costs exactly as many source calls as loadCharacter (the explanation adds none)", async () => {
    const plain = countingSource();
    const rich = countingSource();

    await loadCharacter("rookie-dev", plain.source);
    await loadCharacterWithChronicle("rookie-dev", rich.source);

    expect(rich.getProfile).toHaveBeenCalledTimes(plain.getProfile.mock.calls.length);
  });

  it("leaves the character exactly as the engine made it", async () => {
    const { source } = countingSource();

    const withExplanation = await loadCharacterWithChronicle("veteran-dev", source);
    const plain = await loadCharacter("veteran-dev", source);

    expect(withExplanation.character).toEqual(plain);
  });

  it("gives the same explanation for the same profile (deterministic)", async () => {
    const first = await loadCharacterWithChronicle("polyglot-dev", countingSource().source);
    const second = await loadCharacterWithChronicle("polyglot-dev", countingSource().source);

    expect(second.classExplanation).toEqual(first.classExplanation);
  });
});
