// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GitHubDataSource } from "./contracts";
import { loadCharacter, loadCharacterProduct, loadCharacterWithChronicle } from "./loadCharacter";
import { MockDataSource } from "./datasource/MockDataSource";

/** A source that counts how many times the profile is fetched (stands in for GitHub requests). */
function countingSource() {
  const inner = new MockDataSource();
  const getProfile = vi.fn((username: string) => inner.getProfile(username));
  const source: GitHubDataSource = { kind: "mock", getProfile };
  return { source, getProfile };
}

afterEach(() => vi.unstubAllEnvs());

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

describe("loadCharacterProduct", () => {
  it("keeps flag-off output equivalent to the existing V1 pipeline", async () => {
    vi.stubEnv("GAME_ENGINE_V2_UI_ENABLED", "false");
    const { source, getProfile } = countingSource();
    const loaded = await loadCharacterProduct("veteran-dev", source);
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(loaded.character).toEqual(await loadCharacter("veteran-dev", new MockDataSource()));
    expect(loaded.presentation).toEqual({ v2Enabled: false, delivery: "unavailable", v2: null });
  });

  it("uses a deterministic ready fixture for the mock seam without a cold GitHub request", async () => {
    vi.stubEnv("GAME_ENGINE_V2_UI_ENABLED", "true");
    const { source, getProfile } = countingSource();
    const loaded = await loadCharacterProduct("veteran-dev", source);
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(loaded.presentation.delivery).toBe("ready");
    expect(loaded.presentation.v2?.identity.subclass?.id).toBe("artificer");
    expect(loaded.presentation.v2?.identity.evolution?.id).toBe("evo-rune-master");
    expect(loaded.presentation.v2?.achievements).toHaveLength(54);
    expect(loaded.presentation.v2?.titles).toHaveLength(40);
  });

  it("applies the allowlist as a reversible per-profile rollout", async () => {
    vi.stubEnv("GAME_ENGINE_V2_UI_ENABLED", "true");
    vi.stubEnv("GAME_ENGINE_V2_UI_ALLOWLIST", "veteran-dev");
    const excluded = await loadCharacterProduct("rookie-dev", countingSource().source);
    const included = await loadCharacterProduct("veteran-dev", countingSource().source);
    expect(excluded.presentation.v2Enabled).toBe(false);
    expect(included.presentation.v2Enabled).toBe(true);
  });
});
