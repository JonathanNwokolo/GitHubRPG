import { describe, expect, it } from "vitest";
import { createRPGCharacter } from "@/game/createCharacter";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { projectRPGCharacterV2Public } from "@/game-v2/publicProjection";
import { makeAverageProfile } from "@/test/builders";
import { resolveHeroIdentity, resolveHeroTitleName } from "./heroIdentity";

function v2Hero() {
  const fixture = GOLDEN_FIXTURES.architecturalSystem();
  return {
    character: createRPGCharacter(fixture.profile),
    v2: projectRPGCharacterV2Public(createRPGCharacterV2(fixture)),
  };
}

describe("resolveHeroIdentity", () => {
  it("V1: class and subclass come from the V1 archetype", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const identity = resolveHeroIdentity(character, null, "pt-BR");
    expect(identity.className).toBe(character.archetype.className);
    expect(identity.subclassName).toBe(character.archetype.subclassName ?? null);
    expect(identity.evolutionName).toBeNull();
  });

  it("V1: class names follow the interface language", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const pt = resolveHeroIdentity(character, null, "pt-BR").className;
    const en = resolveHeroIdentity(character, null, "en").className;
    expect(en).not.toBe("");
    expect(en).not.toBe(pt);
  });

  it("V2: class, subclass and evolution come from V2", () => {
    const { character, v2 } = v2Hero();
    const identity = resolveHeroIdentity(character, v2, "pt-BR");
    expect(identity.className).toBe(v2.identity.className);
    expect(identity.subclassName).toBe(v2.identity.subclass?.name.pt ?? null);
    expect(identity.evolutionName).toBe(v2.identity.evolution?.name.pt ?? null);
  });

  it("V2: no confident subclass is null, and the V1 subclass never leaks in", () => {
    const { character, v2 } = v2Hero();
    const bare = { ...v2, identity: { ...v2.identity, subclass: null, evolution: null } };
    const identity = resolveHeroIdentity(character, bare, "pt-BR");
    expect(identity.subclassName).toBeNull();
    expect(identity.evolutionName).toBeNull();
  });

  it("V2: names follow the interface language", () => {
    const { character, v2 } = v2Hero();
    expect(resolveHeroIdentity(character, v2, "en").subclassName).toBe(v2.identity.subclass?.name.en ?? null);
  });
});

describe("resolveHeroTitleName", () => {
  it("returns an unlocked saved pick, otherwise the default, otherwise null", () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "artorias" }));
    const unlocked = character.titles.filter((title) => title.unlocked);
    expect(unlocked.length).toBeGreaterThan(0);

    const pick = unlocked[unlocked.length - 1];
    expect(resolveHeroTitleName(character, null, pick.id, "pt-BR")).toBe(pick.name);

    const locked = character.titles.find((title) => !title.unlocked);
    const fallback = resolveHeroTitleName(character, null, locked?.id, "pt-BR");
    expect(fallback).toBe(character.titles.find((title) => title.id === character.defaultTitleId)?.name ?? null);

    expect(resolveHeroTitleName({ ...character, titles: [], defaultTitleId: null }, null, undefined, "pt-BR")).toBeNull();
  });
});
