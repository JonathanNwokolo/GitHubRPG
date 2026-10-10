import { describe, expect, it } from "vitest";
import {
  achievementCardPath,
  chronicleCardPath,
  parseGitHubProfileInput,
  profileBadgePath,
  profileBadgeUrl,
  profileCardPath,
  socialCardPath,
} from "./profileUrl";
import { readmeBadgeMarkdown } from "@/features/badge/readmeMarkdown";

const ENV = { NEXT_PUBLIC_SITE_URL: "https://githubrpg.vercel.app", NODE_ENV: "production" };

describe("badge and card URLs", () => {
  it("accepts a username or canonical GitHub profile URL as profile input", () => {
    expect(parseGitHubProfileInput("JonathanNwokolo")).toBe("JonathanNwokolo");
    expect(parseGitHubProfileInput("https://github.com/JonathanNwokolo")).toBe("JonathanNwokolo");
    expect(parseGitHubProfileInput("https://www.github.com/JonathanNwokolo/")).toBe("JonathanNwokolo");
    expect(() => parseGitHubProfileInput("https://github.com/org/repo")).toThrow();
    expect(() => parseGitHubProfileInput("https://example.com/JonathanNwokolo")).toThrow();
  });

  it("badge: normalised username, absolute from the one configured origin", () => {
    expect(profileBadgePath("  JonathanNwokolo ")).toBe("/api/badge/jonathannwokolo");
    expect(profileBadgeUrl("JonathanNwokolo", ENV)).toBe("https://githubrpg.vercel.app/api/badge/jonathannwokolo");
    expect(profileBadgeUrl("x", { NEXT_PUBLIC_SITE_URL: "https://example.com" })).toBe("https://example.com/api/badge/x");
  });

  it("achievement and chronicle cards extend the Hero Card path", () => {
    expect(profileCardPath("Octocat")).toBe("/api/card/octocat");
    expect(achievementCardPath("Octocat", "age-5")).toBe("/api/card/octocat/achievement/age-5");
    expect(chronicleCardPath("Octocat", 2025)).toBe("/api/card/octocat/chronicle/2025");
  });

  it("the Hero Social Card path carries only a closed language switch and an optional title id", () => {
    expect(socialCardPath("Octocat")).toBe("/api/card/octocat/social");
    expect(socialCardPath("Octocat", "en")).toBe("/api/card/octocat/social?lang=en");
    expect(socialCardPath("Octocat", "pt-BR", "title-years-5")).toBe("/api/card/octocat/social?title=title-years-5");
    expect(socialCardPath("Octocat", "en", "title-years-5")).toBe("/api/card/octocat/social?lang=en&title=title-years-5");
    // A title id with reserved characters can never break out of the query string.
    expect(socialCardPath("octocat", "pt-BR", "a&b=c")).toBe("/api/card/octocat/social?title=a%26b%3Dc");
  });

  it("only English adds a language switch", () => {
    expect(achievementCardPath("octocat", "age-5", "pt-BR")).not.toContain("?");
    expect(achievementCardPath("octocat", "age-5", "en")).toMatch(/\?lang=en$/);
    expect(chronicleCardPath("octocat", 2025, "en")).toMatch(/\?lang=en$/);
  });
});

describe("README Markdown", () => {
  it("is a badge image that links to the character sheet", () => {
    expect(readmeBadgeMarkdown("JonathanNwokolo", ENV)).toBe(
      "[![GitHub RPG](https://githubrpg.vercel.app/api/badge/jonathannwokolo)](https://githubrpg.vercel.app/jonathannwokolo)"
    );
  });

  it("follows the configured site URL (no hard-coded domain)", () => {
    expect(readmeBadgeMarkdown("x", { NEXT_PUBLIC_SITE_URL: "https://example.com" })).toBe(
      "[![GitHub RPG](https://example.com/api/badge/x)](https://example.com/x)"
    );
  });
});
