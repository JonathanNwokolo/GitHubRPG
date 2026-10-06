import { describe, expect, it } from "vitest";
import { LANGUAGE_RULES, classForLanguage, determineArchetype } from "@/game/engine";
import { analysisFromShares } from "@/test/builders";
import { buildClassExplanation } from "./classExplanation";

/** Explains the engine's own result for a set of language shares (percent). */
function explain(shares: Record<string, number>, coverage: "full" | "partial" | "unavailable" = "full") {
  const analysis = analysisFromShares(shares);
  const archetype = determineArchetype(analysis);
  return { archetype, explanation: buildClassExplanation(archetype, analysis, coverage) };
}

describe("class explanation: class from the dominant language", () => {
  it("explains Mago through TypeScript, with its share of the analysed bytes", () => {
    const { explanation } = explain({ TypeScript: 59.6, HTML: 25.8, CSS: 14.6 });

    expect(explanation.status).toBe("language");
    expect(explanation.className).toBe("Mago");
    expect(explanation.dominant?.language).toBe("TypeScript");
    expect(explanation.dominant?.share).toBeCloseTo(0.596, 3);
  });

  it("takes the class straight from the engine's archetype (never its own mapping)", () => {
    for (const [language, className] of [
      ["Python", "Alquimista"],
      ["Rust", "Guerreiro"],
      ["Go", "Patrulheiro"],
      ["Dart", "Tecelão"],
    ] as const) {
      const { explanation } = explain({ [language]: 100 });
      expect(explanation.className).toBe(className);
      expect(explanation.className).toBe(classForLanguage(language));
    }
  });

  it("uses the engine's thresholds, so a rebalance reaches the explanation without touching it", () => {
    const { explanation } = explain({ TypeScript: 100 });
    expect(explanation.rules).toEqual({
      relevantShare: LANGUAGE_RULES.relevantShare,
      subclassShare: LANGUAGE_RULES.subclassShare,
    });
  });
});

describe("class explanation: subclass", () => {
  it("class + subclass: HTML is the next eligible affinity and maps to Bardo", () => {
    const { archetype, explanation } = explain({ TypeScript: 59.6, HTML: 25.8, Python: 14.6 });

    expect(archetype.subclassName).toBe("Bardo");
    expect(explanation.subclassReason).toBe("assigned");
    expect(explanation.subclass).toMatchObject({ className: "Bardo", language: "HTML" });
    expect(explanation.subclass?.share).toBeCloseTo(0.258, 3);
    // 25.8 of 100 relevant bytes: the figure the subclass rule reads.
    expect(explanation.subclass?.relevantShare).toBeCloseTo(0.258, 3);
  });

  it("only a class: a single relevant language leaves no subclass, and says so", () => {
    const { archetype, explanation } = explain({ TypeScript: 100 });

    expect(archetype.subclassName).toBeUndefined();
    expect(explanation.subclass).toBeNull();
    expect(explanation.subclassReason).toBe("noOtherLanguage");
    expect(explanation.checks).toEqual([]);
  });

  it("two languages of the same class (TypeScript + JavaScript) do not create a subclass", () => {
    const { archetype, explanation } = explain({ TypeScript: 70, JavaScript: 30 });

    expect(archetype.subclassName).toBeUndefined();
    expect(explanation.subclassReason).toBe("noDistinctAffinity");
    expect(explanation.checks).toEqual([
      expect.objectContaining({ language: "JavaScript", className: "Mago", outcome: "sameClass" }),
    ]);
  });

  it("a same-class language is skipped and the next distinct one becomes the subclass", () => {
    const { archetype, explanation } = explain({ TypeScript: 55, JavaScript: 25, Python: 20 });

    expect(archetype.subclassName).toBe("Alquimista");
    expect(explanation.subclass).toMatchObject({ className: "Alquimista", language: "Python" });
    expect(explanation.checks.map((check) => [check.language, check.outcome])).toEqual([
      ["JavaScript", "sameClass"],
      ["Python", "subclass"],
    ]);
  });

  it("a relevant language below the subclass threshold is reported as the near miss", () => {
    // 6% each: relevant (>= 5%) but below the 10% of the relevant usage a subclass needs.
    const { archetype, explanation } = explain({ TypeScript: 88, HTML: 6, Python: 6 });

    expect(archetype.subclassName).toBeUndefined();
    expect(explanation.subclassReason).toBe("belowThreshold");
    const miss = explanation.checks.find((check) => check.outcome === "belowThreshold");
    expect(miss).toMatchObject({ language: "HTML", className: "Bardo" });
    expect(miss?.relevantShare).toBeLessThan(LANGUAGE_RULES.subclassShare);
  });

  it("exactly at the threshold counts (the engine's rule is >=)", () => {
    // 90 / 10: Python holds exactly 10% of the relevant usage.
    const { archetype, explanation } = explain({ TypeScript: 90, Python: 10 });

    expect(archetype.subclassName).toBe("Alquimista");
    expect(explanation.subclassReason).toBe("assigned");
  });

  it("a language below the relevance floor is not even weighed", () => {
    // 4% < 5%: not a relevant language, so there is no other language to compare.
    const { explanation } = explain({ TypeScript: 96, Python: 4 });

    expect(explanation.subclassReason).toBe("noOtherLanguage");
    expect(explanation.checks).toEqual([]);
  });

  it("languages without a class are listed as such and never become a subclass", () => {
    const { archetype, explanation } = explain({ TypeScript: 70, Makefile: 30 });

    expect(archetype.subclassName).toBeUndefined();
    expect(explanation.subclassReason).toBe("noDistinctAffinity");
    expect(explanation.checks).toEqual([expect.objectContaining({ language: "Makefile", outcome: "noClass" })]);
  });

  it("stops where the engine stops: only the FIRST eligible language is the subclass", () => {
    const { explanation } = explain({ TypeScript: 50, Python: 30, HTML: 20 });

    expect(explanation.subclass?.language).toBe("Python");
    expect(explanation.checks.map((check) => check.language)).toEqual(["Python"]);
  });
});

describe("class explanation: fallbacks", () => {
  it("Aventureiro by an unmapped dominant language", () => {
    const { archetype, explanation } = explain({ Lua: 100 });

    expect(archetype.className).toBe("Aventureiro");
    expect(explanation.status).toBe("unmappedLanguage");
    expect(explanation.className).toBe("Aventureiro");
    expect(explanation.dominant).toMatchObject({ language: "Lua" });
  });

  it("an Aventureiro can still have a subclass from a mapped language", () => {
    const { archetype, explanation } = explain({ Lua: 60, TypeScript: 40 });

    expect(archetype.className).toBe("Aventureiro");
    expect(archetype.subclassName).toBe("Mago");
    expect(explanation.subclass).toMatchObject({ className: "Mago", language: "TypeScript" });
    expect(explanation.subclassReason).toBe("assigned");
  });

  it("no languages at all", () => {
    const { archetype, explanation } = explain({});

    expect(archetype.className).toBe("Aventureiro");
    expect(explanation).toMatchObject({
      status: "noLanguages",
      className: "Aventureiro",
      dominant: null,
      subclass: null,
      subclassReason: "notApplicable",
      checks: [],
    });
  });

  it("unavailable languages claim nothing about them", () => {
    const { explanation } = explain({}, "unavailable");

    expect(explanation).toMatchObject({ status: "unavailable", dominant: null, subclass: null, checks: [] });
  });

  it("keeps the partial coverage so the percentages can be flagged as approximate", () => {
    const { explanation } = explain({ TypeScript: 70, Python: 30 }, "partial");

    expect(explanation.coverage).toBe("partial");
    expect(explanation.status).toBe("language");
  });
});

describe("class explanation never disagrees with the engine", () => {
  const MIXES: Array<Record<string, number>> = [
    { TypeScript: 100 },
    { TypeScript: 59.6, HTML: 25.8, CSS: 14.6 },
    { Python: 40, JavaScript: 35, Rust: 25 },
    { Go: 50, Python: 30, Shell: 20 },
    { Lua: 50, Java: 30, Kotlin: 20 },
    { JavaScript: 45, TypeScript: 45, HTML: 5, CSS: 5 },
    { Ruby: 30, PHP: 30, Swift: 30, Dart: 10 },
    { Rust: 94, C: 3, Python: 3 },
    { Makefile: 40, Dockerfile: 30, TypeScript: 30 },
    { C: 20, "C++": 20, "C#": 20, Java: 20, Go: 20 },
    { Shell: 12, PowerShell: 11, Python: 77 },
    {},
  ];

  it.each(MIXES.map((mix) => [JSON.stringify(mix), mix] as const))("%s", (_label, mix) => {
    const { archetype, explanation } = explain(mix);

    expect(explanation.className).toBe(archetype.className);
    expect(explanation.dominant?.language).toBe(archetype.dominantLanguage);
    expect(explanation.subclass?.className).toBe(archetype.subclassName);
    expect(explanation.subclass?.language).toBe(archetype.subclassLanguage);
    // The trace and the engine pick the same language: the first (and only) "subclass" outcome.
    const traced = explanation.checks.find((check) => check.outcome === "subclass");
    expect(traced?.language).toBe(archetype.subclassLanguage);
  });

  it("is deterministic", () => {
    const first = explain({ TypeScript: 60, HTML: 25, Python: 15 }).explanation;
    const second = explain({ TypeScript: 60, HTML: 25, Python: 15 }).explanation;
    expect(second).toEqual(first);
  });
});
