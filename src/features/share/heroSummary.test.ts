import { describe, expect, it } from "vitest";
import { generateHeroSummary } from "./heroSummary";
import { createRPGCharacter } from "@/game/createCharacter";
import { languagesFromShares, m, makeProfile } from "@/test/builders";

describe("generateHeroSummary", () => {
  it("generates beginner lore for an empty level 1 profile", () => {
    const character = createRPGCharacter(
      makeProfile({
        username: "empty-dev",
        accountCreatedAt: "2025-12-25T00:00:00Z",
        languages: [],
      })
    );

    const summary = generateHeroSummary(character);
    expect(summary).toBe(
      "Aventureiro no início da jornada, pronto para despertar seus poderes no código."
    );
  });

  it("identifies mage specializing in frontend interfaces", () => {
    const character = createRPGCharacter(
      makeProfile({
        username: "rookie-dev",
        languages: languagesFromShares({ TypeScript: 80, CSS: 20 }, 5),
        commits: m(50),
        pullRequests: m(10),
      })
    );

    const summary = generateHeroSummary(character);
    expect(summary).toBe("Mago versado em interfaces, com forte afinidade em TypeScript.");
  });

  it("identifies seasoned warrior molded by years of contributions", () => {
    const character = createRPGCharacter(
      makeProfile({
        username: "veteran-dev",
        accountCreatedAt: "2014-01-01T00:00:00Z",
        commits: m(8000),
        pullRequests: m(300),
        reviews: m(150),
        ownRepositories: m(50),
        starsReceived: m(500),
        activity: {
          activeDays: m(1500),
          longestStreakDays: m(45),
          currentStreakDays: m(10),
          recentActiveDays: m(80),
          monthlyContributions: Array(100).fill(50),
          monthlyCoverage: "full",
        },
        languages: languagesFromShares({ Rust: 75, C: 25 }, 12),
      })
    );

    const summary = generateHeroSummary(character);
    expect(summary).toBe("Guerreiro veterano, moldado por anos de contribuição em Rust.");
  });

  it("identifies systems alchemist with high versatility", () => {
    const character = createRPGCharacter(
      makeProfile({
        username: "polyglot-dev",
        accountCreatedAt: "2020-01-01T00:00:00Z",
        commits: m(1200),
        pullRequests: m(80),
        reviews: m(30),
        ownRepositories: m(25),
        activity: {
          activeDays: m(400),
          longestStreakDays: m(20),
          currentStreakDays: m(5),
          recentActiveDays: m(70),
          monthlyContributions: Array(60).fill(30),
          monthlyCoverage: "full",
        },
        languages: languagesFromShares(
          { Python: 35, Go: 25, TypeScript: 20, Rust: 20 },
          8
        ),
      })
    );

    const summary = generateHeroSummary(character);
    expect(summary).toBe("Alquimista de sistemas, com jornada crescente e perfil versátil.");
  });

  it("handles profile without languages gracefully", () => {
    const character = createRPGCharacter(
      makeProfile({
        username: "coder-new",
        commits: m(20),
        pullRequests: m(2),
        languages: [],
      })
    );

    const summary = generateHeroSummary(character);
    expect(summary).toContain("Aventureiro");
    expect(summary).not.toContain("undefined");
    expect(summary).not.toContain("null");
  });

  it("handles paladin with high reputation", () => {
    const character = createRPGCharacter(
      makeProfile({
        username: "popular-paladin",
        languages: languagesFromShares({ Java: 70, Kotlin: 30 }, 10),
        starsReceived: m(500),
        followers: m(300),
      })
    );

    const summary = generateHeroSummary(character);
    expect(summary).toContain("Paladino guardião da comunidade");
    expect(summary).toContain("Java");
  });
});
