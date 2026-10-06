import { describe, expect, it } from "vitest";
import { analyzeLanguages } from "../languages";
import { SKILL } from "../constants";
import { analysisFromShares } from "@/test/builders";
import { calculateSkills, getSkillTier, rawSkillScore, skillLevelFromScore } from "./calculateSkills";

describe("skill tiers", () => {
  it.each([
    [1, "Aprendiz"],
    [4, "Aprendiz"],
    [5, "Adepto"],
    [8, "Adepto"],
    [9, "Especialista"],
    [12, "Especialista"],
    [13, "Mestre"],
    [16, "Mestre"],
    [17, "Arquimestre"],
    [19, "Arquimestre"],
    [20, "Lendário"],
  ])("level %i is %s", (level, tier) => {
    expect(getSkillTier(level)).toBe(tier);
  });
});

describe("skill weights (V1.1)", () => {
  it("are share 25 / presence 40 / volume 35 and sum to 100%", () => {
    expect(SKILL.weights).toEqual({ share: 0.25, presence: 0.4, volume: 0.35 });
    expect(SKILL.weights.share + SKILL.weights.presence + SKILL.weights.volume).toBeCloseTo(1, 10);
  });

  it("polyglot distributions stay inside 1-20 and every relevant language keeps a skill", () => {
    const skills = calculateSkills(
      analyzeLanguages([
        { name: "TypeScript", bytes: 800_000, repoCount: 8 },
        { name: "Python", bytes: 600_000, repoCount: 6 },
        { name: "Go", bytes: 400_000, repoCount: 4 },
        { name: "CSS", bytes: 200_000, repoCount: 2 },
      ])
    );
    expect(skills).toHaveLength(4);
    for (const skill of skills) {
      expect(skill.level).toBeGreaterThanOrEqual(1);
      expect(skill.level).toBeLessThanOrEqual(20);
    }
  });

  it("specialization is still rewarded: the same volume and repos at a higher share scores higher", () => {
    const base = { name: "X", bytes: 1_000_000, repoCount: 10, share: 0.2 };
    expect(rawSkillScore({ ...base, share: 0.9 })).toBeGreaterThan(rawSkillScore(base));
  });
});

describe("skill level", () => {
  it("maps the raw score non-linearly onto 1-20", () => {
    expect(skillLevelFromScore(0)).toBe(1);
    expect(skillLevelFromScore(1)).toBe(20);
    // score^1.5: half the raw score is clearly less than half the span
    expect(skillLevelFromScore(0.5)).toBeLessThan(1 + 19 / 2);
  });

  it("a single small repo that is 100% one language cannot reach level 20", () => {
    const [skill] = calculateSkills(
      analyzeLanguages([{ name: "Rust", bytes: 50_000, repoCount: 1 }])
    );
    expect(skill.sharePercent).toBe(100);
    expect(skill.level).toBeLessThan(10);
  });

  it("a language with many repos and lots of code outranks one tiny repo", () => {
    const skills = calculateSkills(
      analyzeLanguages([
        { name: "Go", bytes: 3_000_000, repoCount: 25 },
        { name: "Lua", bytes: 60_000, repoCount: 1 },
      ])
    );
    const go = skills.find((s) => s.name === "Go");
    const lua = skills.find((s) => s.name === "Lua");
    expect(go).toBeDefined();
    expect(go!.level).toBeGreaterThan(lua?.level ?? 0);
    expect(go!.level).toBeGreaterThanOrEqual(13);
  });

  it("always stays inside 1-20, even for absurd input", () => {
    const [skill] = calculateSkills(
      analyzeLanguages([{ name: "A", bytes: 1e15, repoCount: 1e9 }])
    );
    expect(skill.level).toBe(20);
    expect(skill.tier).toBe("Lendário");
    expect(skillLevelFromScore(Number.NaN)).toBe(1);
  });

  it("combines share, repo presence and volume", () => {
    const base = { name: "X", bytes: 100_000, repoCount: 3, share: 0.5 };
    expect(rawSkillScore({ ...base, share: 0.9 })).toBeGreaterThan(rawSkillScore(base));
    expect(rawSkillScore({ ...base, repoCount: 20 })).toBeGreaterThan(rawSkillScore(base));
    expect(rawSkillScore({ ...base, bytes: 2_000_000 })).toBeGreaterThan(rawSkillScore(base));
  });
});

describe("calculateSkills", () => {
  it("is empty without languages", () => {
    expect(calculateSkills(analysisFromShares({}))).toEqual([]);
  });

  it("hides residual languages below 3%", () => {
    const names = calculateSkills(analysisFromShares({ TypeScript: 94, Python: 3, CSS: 2, Shell: 1 })).map(
      (s) => s.name
    );
    expect(names).toEqual(expect.arrayContaining(["TypeScript", "Python"]));
    expect(names).not.toContain("CSS");
    expect(names).not.toContain("Shell");
  });

  it("exposes share, repo count and a stable id", () => {
    const [skill] = calculateSkills(analysisFromShares({ "C++": 100 }, 7));
    expect(skill).toMatchObject({ id: "cpp", name: "C++", sharePercent: 100, repoCount: 7 });
  });

  it("is sorted by level, then share, then name, and deterministic", () => {
    const shares = { TypeScript: 40, Python: 30, Go: 20, CSS: 10 };
    const a = calculateSkills(analysisFromShares(shares));
    const b = calculateSkills(analysisFromShares(shares));
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) {
      expect(a[i - 1].level).toBeGreaterThanOrEqual(a[i].level);
    }
  });
});
