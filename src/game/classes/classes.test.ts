import { describe, expect, it } from "vitest";
import { analysisFromShares } from "@/test/builders";
import { classForLanguage, determineArchetype } from "./classMatrix";

const archetypeOf = (shares: Record<string, number>) => determineArchetype(analysisFromShares(shares));

describe("class from the dominant language", () => {
  it.each([
    ["JavaScript", "Mago"],
    ["TypeScript", "Mago"],
    ["Python", "Alquimista"],
    ["Rust", "Guerreiro"],
    ["C", "Guerreiro"],
    ["C++", "Guerreiro"],
    ["Go", "Patrulheiro"],
    ["Java", "Paladino"],
    ["C#", "Paladino"],
    ["HTML", "Bardo"],
    ["CSS", "Bardo"],
    ["Shell", "Ladino"],
    ["PowerShell", "Ladino"],
    ["Ruby", "Oráculo"],
    ["PHP", "Escriba"],
    ["Kotlin", "Sentinela"],
    ["Swift", "Sentinela"],
    ["Dart", "Tecelão"],
  ])("%s -> %s", (language, className) => {
    expect(archetypeOf({ [language]: 100 }).className).toBe(className);
  });

  it("is case-insensitive", () => {
    expect(classForLanguage("typescript")).toBe("Mago");
    expect(classForLanguage("  RUST ")).toBe("Guerreiro");
  });

  it("falls back to Aventureiro for unknown languages", () => {
    expect(archetypeOf({ Lua: 100 }).className).toBe("Aventureiro");
    expect(classForLanguage("Brainfuck")).toBe("Aventureiro");
  });

  it("is Aventureiro without subclass when there are no languages", () => {
    const a = determineArchetype(analysisFromShares({}));
    expect(a.className).toBe("Aventureiro");
    expect(a.subclassName).toBeUndefined();
    expect(a.dominantLanguage).toBeUndefined();
  });

  it("uses the language with the most bytes, ties broken by name", () => {
    expect(archetypeOf({ Python: 50, Rust: 50 }).className).toBe("Alquimista");
  });

  it("class is identity only: it carries a description and no power modifier", () => {
    const a = archetypeOf({ TypeScript: 100 });
    expect(a.classDescription.length).toBeGreaterThan(0);
    expect(Object.keys(a)).not.toContain("bonus");
  });
});

describe("subclass from the second relevant language", () => {
  it("TypeScript 63 / Python 22 / CSS 15 -> Mago / Alquimista", () => {
    const a = archetypeOf({ TypeScript: 63, Python: 22, CSS: 15 });
    expect(a.className).toBe("Mago");
    expect(a.subclassName).toBe("Alquimista");
    expect(a.subclassLanguage).toBe("Python");
  });

  it("TypeScript 97 / Python 1 -> no subclass (Python is not even relevant)", () => {
    expect(archetypeOf({ TypeScript: 97, Python: 1, Shell: 2 }).subclassName).toBeUndefined();
  });

  it("a second language below 10% of the relevant usage gives no subclass", () => {
    expect(archetypeOf({ TypeScript: 91, Python: 9 }).subclassName).toBeUndefined();
  });

  it("a second language at exactly 10% gives the subclass", () => {
    expect(archetypeOf({ TypeScript: 90, Python: 10 }).subclassName).toBe("Alquimista");
  });

  it("a second language above 10% gives the subclass", () => {
    expect(archetypeOf({ TypeScript: 88, Python: 12 }).subclassName).toBe("Alquimista");
    expect(archetypeOf({ Rust: 70, Go: 30 }).subclassName).toBe("Patrulheiro");
  });

  it("measures the 10% over relevant languages only", () => {
    // Python is 9.5% of all bytes, but 95/895 = 10.6% of the relevant usage (Lua, Perl and Zig are noise below 5%).
    const a = archetypeOf({ TypeScript: 800, Python: 95, Lua: 40, Perl: 35, Zig: 30 });
    expect(a.subclassName).toBe("Alquimista");
  });

  it("skips a second language that maps to the same class (TS + JS is still Mago)", () => {
    const a = archetypeOf({ TypeScript: 50, JavaScript: 30, Python: 20 });
    expect(a.className).toBe("Mago");
    expect(a.subclassName).toBe("Alquimista");
  });

  it("a third language at exactly 10% can still become the subclass when the second one is skipped", () => {
    const a = archetypeOf({ TypeScript: 70, JavaScript: 20, Python: 10 });
    expect(a.className).toBe("Mago");
    expect(a.subclassName).toBe("Alquimista");
    expect(a.subclassLanguage).toBe("Python");
  });

  it("skips a same-class second language and ignores a third language below 10%", () => {
    expect(archetypeOf({ TypeScript: 70, JavaScript: 21, Python: 9 }).subclassName).toBeUndefined();
  });

  it("never turns an unknown language into a subclass", () => {
    expect(archetypeOf({ TypeScript: 60, Lua: 40 }).subclassName).toBeUndefined();
  });
});
