// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { GitHubRateLimitError, GitHubUnavailableError, InvalidUsernameError } from "@/data/github/errors";
import { loadCharacterProduct } from "@/data/loadCharacter";
import type { ClassExplanation } from "@/features/character/classExplanation";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import type { RPGCharacter } from "@/game/types";
import CharacterSheet from "./CharacterSheet";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/data/loadCharacter", () => ({
  loadCharacterProduct: vi.fn(),
}));

vi.mock("./CharacterPageClient", () => ({
  default: (props: unknown) => ({ type: "CharacterPageClient", props }),
}));

const mockedLoadCharacter = vi.mocked(loadCharacterProduct);
const source = { kind: "mock" as const, getProfile: vi.fn() };

describe("CharacterSheet (the slow, streamed part of the route)", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
  });

  it("renders a valid character from the server-loaded data, using the page's data source", async () => {
    const character = { identity: { username: "torvalds" }, progression: { level: 58 } };
    const chronicle = { adventurerName: "Linus", coverage: "full" };
    const classExplanation = { status: "language", className: "Guerreiro" };
    mockedLoadCharacter.mockResolvedValueOnce({
      character: character as unknown as RPGCharacter,
      chronicle: chronicle as unknown as DeveloperChronicle,
      classExplanation: classExplanation as unknown as ClassExplanation,
      presentation: { v2Enabled: false, delivery: "unavailable", v2: null },
    });

    await expect(CharacterSheet({ username: "torvalds", source })).resolves.toMatchObject({
      props: { character, chronicle, classExplanation, presentation: { v2Enabled: false, delivery: "unavailable", v2: null }, username: "torvalds" },
    });
    expect(mockedLoadCharacter).toHaveBeenCalledWith("torvalds", source, expect.objectContaining({ scheduleBackground: expect.any(Function) }));
  });

  it("an unknown profile is still a 404, not a generic error", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new ProfileNotFoundError("ghost"));
    await expect(CharacterSheet({ username: "ghost", source })).rejects.toThrow("NEXT_NOT_FOUND");

    mockedLoadCharacter.mockRejectedValueOnce(new InvalidUsernameError());
    await expect(CharacterSheet({ username: "no way", source })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("GitHub failures are rethrown untouched for error.tsx (never turned into a 404)", async () => {
    for (const failure of [
      new GitHubUnavailableError("network"),
      new GitHubRateLimitError("secondary", null, 0),
      new Error("boom"),
    ]) {
      mockedLoadCharacter.mockRejectedValueOnce(failure);
      const error = await CharacterSheet({ username: "torvalds", source }).catch((e: unknown) => e);
      expect(error).toBe(failure);
    }
  });
});
