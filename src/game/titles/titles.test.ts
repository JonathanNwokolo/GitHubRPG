import { describe, expect, it } from "vitest";
import { calculateAccountAge } from "../age";
import { determineArchetype } from "../classes/classMatrix";
import { analyzeLanguages } from "../languages";
import { buildProgressMetrics } from "../progress";
import type { DeveloperProfile, TitleProgress } from "../types";
import { languagesFromShares, m, makeProfile } from "@/test/builders";
import { evaluateTitles, selectDefaultTitleId } from "./titleList";

function titlesOf(profile: DeveloperProfile): TitleProgress[] {
  const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate);
  const languages = analyzeLanguages(profile.languages);
  return evaluateTitles(buildProgressMetrics(profile, languages, age), determineArchetype(languages));
}

const titleNamed = (list: TitleProgress[], name: string) => {
  const found = list.find((t) => t.name === name);
  if (!found) throw new Error(`title ${name} not found`);
  return found;
};

describe("threshold titles", () => {
  it("are locked for an empty profile", () => {
    expect(titlesOf(makeProfile()).every((t) => !t.unlocked)).toBe(true);
  });

  it("unlock at exactly the target and not one below (stars)", () => {
    expect(titleNamed(titlesOf(makeProfile({ starsReceived: m(99) })), "Senhor das Estrelas").unlocked).toBe(false);
    expect(titleNamed(titlesOf(makeProfile({ starsReceived: m(100) })), "Senhor das Estrelas").unlocked).toBe(true);
  });

  it("covers every ladder of the spec", () => {
    const names = titlesOf(makeProfile()).map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Portador da Centelha", "Caçador de Estrelas", "Senhor das Estrelas", "Arauto das Constelações", "Lenda Celestial",
        "Forjador de Código", "Incansável", "Mestre da Forja", "Forjador Eterno",
        "Aliado do Código", "Emissário Open Source", "Guardião da Comunidade", "Campeão dos Reinos Abertos",
        "Explorador Arcano", "Poliglota das Runas", "Mestre das Afinidades",
        "Cronista", "Guardião Ancestral", "Lenda dos Repositórios", "Ancião do Código",
      ])
    );
  });

  it("shows progress towards the next title: 72 / 100 stars, 28 to go", () => {
    const list = titlesOf(makeProfile({ starsReceived: m(72) }));
    const lord = titleNamed(list, "Senhor das Estrelas");
    expect(lord).toMatchObject({ kind: "threshold", current: 72, target: 100, remaining: 28, unlocked: false, isNext: true });
    expect(titleNamed(list, "Caçador de Estrelas").unlocked).toBe(true);
    expect(titleNamed(list, "Arauto das Constelações")).toMatchObject({ isNext: false });
  });

  it("flags exactly one 'next' title per ladder", () => {
    const list = titlesOf(makeProfile({ starsReceived: m(30), commits: m(600) }));
    const nextByCategory = new Map<string, number>();
    for (const t of list) if (t.kind === "threshold" && t.isNext) nextByCategory.set(t.category, (nextByCategory.get(t.category) ?? 0) + 1);
    expect([...nextByCategory.values()].every((count) => count === 1)).toBe(true);
    expect(nextByCategory.size).toBe(5);
  });

  it("is cumulative", () => {
    const list = titlesOf(makeProfile({ commits: m(5_000) }));
    for (const name of ["Forjador de Código", "Incansável", "Mestre da Forja"]) {
      expect(titleNamed(list, name).unlocked).toBe(true);
    }
    expect(titleNamed(list, "Forjador Eterno")).toMatchObject({ unlocked: false, remaining: 5_000 });
  });

  it("does not claim a remaining amount for partial data", () => {
    const list = titlesOf(makeProfile({ commits: m(300, "partial") }));
    const forger = titleNamed(list, "Forjador de Código");
    expect(forger.kind).toBe("threshold");
    if (forger.kind === "threshold") {
      expect(forger.unlocked).toBe(false);
      expect(forger.remaining).toBeNull();
      expect(forger.progressPercent).toBeNull();
    }
  });

  it("uses the full account date for longevity titles", () => {
    const list = titlesOf(
      makeProfile({ accountCreatedAt: "2021-12-15T00:00:00Z", referenceDate: "2026-01-10T00:00:00Z" })
    );
    expect(titleNamed(list, "Cronista").unlocked).toBe(true);
    expect(titleNamed(list, "Guardião Ancestral").unlocked).toBe(false);
  });
});

describe("class + subclass titles", () => {
  const COMBOS: Array<[Record<string, number>, string]> = [
    [{ TypeScript: 70, Python: 30 }, "Arcanista do Código"],
    [{ TypeScript: 70, Rust: 30 }, "Cavaleiro Rúnico"],
    [{ TypeScript: 70, CSS: 30 }, "Tecelão de Interfaces"],
    [{ Python: 70, Rust: 30 }, "Ferreiro Arcano"],
    [{ Java: 70, TypeScript: 30 }, "Guardião Arcano"],
    [{ Go: 70, Python: 30 }, "Explorador de Sistemas"],
    [{ Shell: 70, TypeScript: 30 }, "Ilusionista do Terminal"],
  ];

  it.each(COMBOS)("%j unlocks %s automatically", (shares, title) => {
    const list = titlesOf(makeProfile({ languages: languagesFromShares(shares) }));
    expect(titleNamed(list, title).unlocked).toBe(true);
    expect(list.filter((t) => t.kind === "combination" && t.unlocked)).toHaveLength(1);
  });

  it("lists requirements without inventing a numeric percentage", () => {
    const list = titlesOf(makeProfile({ languages: languagesFromShares({ TypeScript: 100 }) }));
    const arcanist = titleNamed(list, "Arcanista do Código");
    expect(arcanist.kind).toBe("combination");
    if (arcanist.kind === "combination") {
      expect(arcanist.unlocked).toBe(false);
      expect(arcanist.requirements).toEqual([
        { kind: "class", value: "Mago", met: true },
        { kind: "subclass", value: "Alquimista", met: false },
      ]);
      expect("progressPercent" in arcanist).toBe(false);
      expect("remaining" in arcanist).toBe(false);
    }
  });

  it("is not symmetric: Alquimista + Mago does not unlock a Mago + Alquimista title", () => {
    const list = titlesOf(makeProfile({ languages: languagesFromShares({ Python: 70, TypeScript: 30 }) }));
    expect(titleNamed(list, "Arcanista do Código").unlocked).toBe(false);
  });
});

describe("default equipped title", () => {
  it("is null when nothing is unlocked", () => {
    expect(selectDefaultTitleId(titlesOf(makeProfile()))).toBeNull();
  });

  it("is the highest unlocked rung and always an unlocked title", () => {
    const list = titlesOf(makeProfile({ starsReceived: m(100), commits: m(500) }));
    const id = selectDefaultTitleId(list);
    const picked = list.find((t) => t.id === id);
    expect(picked?.unlocked).toBe(true);
    expect(picked?.name).toBe("Senhor das Estrelas");
  });

  it("is deterministic", () => {
    const profile = makeProfile({ starsReceived: m(1_000), commits: m(10_000) });
    expect(selectDefaultTitleId(titlesOf(profile))).toBe(selectDefaultTitleId(titlesOf(profile)));
  });
});
