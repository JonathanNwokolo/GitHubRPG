import { describe, expect, it } from "vitest";
import { createRPGCharacterV2 } from "./engine";
import { GOLDEN_FIXTURES } from "./fixtures";
import {
  createCharacterPresentationModel,
  projectRPGCharacterV2Public,
  resolvePublicEquippedTitle,
} from "./publicProjection";

describe("V2 public product projection", () => {
  const character = createRPGCharacterV2(GOLDEN_FIXTURES.architecturalSystem());

  it("projects complete catalogs and presentation limits without engine internals", () => {
    const projected = projectRPGCharacterV2Public(character);
    expect(projected.achievements).toHaveLength(54);
    expect(projected.titles).toHaveLength(40);
    expect(projected.grimoire.affinities.length).toBeLessThanOrEqual(8);
    expect(projected.grimoire.schools.length).toBeLessThanOrEqual(5);
    expect(projected.grimoire.artifacts.length).toBeLessThanOrEqual(8);
    const serialized = JSON.stringify(projected);
    for (const forbidden of ["lowerBound", "upperBound", "guaranteedMargin", "\"evidence\":", "\"requests\":", "sourceFingerprint", "rulesApplied"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("redacts every locked secret before data crosses the client boundary", () => {
    const projected = projectRPGCharacterV2Public(character);
    const lockedSecrets = character.achievements.filter((item) => item.secret && !item.unlocked);
    expect(lockedSecrets.length).toBeGreaterThan(0);
    for (const raw of lockedSecrets) {
      const publicItem = projected.achievements.find((item) => item.id === raw.id)!;
      expect(publicItem.name).toEqual({ pt: "???", en: "???" });
      expect(publicItem.description).toEqual({ pt: "Conquista desconhecida", en: "Unknown achievement" });
      expect(publicItem.progress).toBeNull();
      expect(publicItem.target).toBeNull();
      expect(JSON.stringify(publicItem)).not.toContain(raw.requirement);
      expect(JSON.stringify(publicItem)).not.toContain(raw.name.pt);
      expect(JSON.stringify(publicItem)).not.toContain(raw.name.en);
    }
  });

  it.each(["ready", "stale", "partial"] as const)("keeps a valid V2 character in %s", (state) => {
    const model = createCharacterPresentationModel(true, { state, character });
    expect(model.delivery).toBe(state);
    expect(model.v2?.engineVersion).toBe("2.0-experimental-v24-evo");
  });

  it.each(["enriching", "unavailable"] as const)("falls back to V1 data in %s", (state) => {
    expect(createCharacterPresentationModel(true, { state, character: null })).toEqual({ v2Enabled: true, delivery: state, v2: null });
  });

  it("makes flag-off a complete V1 rollback", () => {
    expect(createCharacterPresentationModel(false, { state: "ready", character })).toEqual({ v2Enabled: false, delivery: "unavailable", v2: null });
  });

  it("preserves a migrated equipped ID and falls back deterministically", () => {
    const projected = projectRPGCharacterV2Public(character);
    const unlocked = projected.titles.find((title) => title.unlocked)!;
    expect(resolvePublicEquippedTitle(projected.titles, unlocked.id, projected.defaultTitleId)?.id).toBe(unlocked.id);
    expect(resolvePublicEquippedTitle(projected.titles, "missing-title", projected.defaultTitleId)?.id ?? null).toBe(projected.defaultTitleId);
  });
});
