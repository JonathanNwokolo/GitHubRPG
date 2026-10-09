// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { GitHubRateLimitError, GitHubUnavailableError, InvalidUsernameError } from "@/data/github/errors";
import { loadCharacterProduct } from "@/data/loadCharacter";
import type { ClassExplanation } from "@/features/character/classExplanation";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import type { RPGCharacter } from "@/game/types";
import { recordInvokedProfile } from "@/data/usage/invokedProfiles";
import CharacterSheet from "./CharacterSheet";
import { after } from "next/server";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/data/loadCharacter", () => ({
  loadCharacterProduct: vi.fn(),
}));

vi.mock("next/server", () => ({ after: vi.fn() }));

vi.mock("@/data/usage/invokedProfiles", () => ({ recordInvokedProfile: vi.fn(async () => true) }));

vi.mock("./CharacterPageClient", () => ({
  default: (props: unknown) => ({ type: "CharacterPageClient", props }),
}));

const mockedLoadCharacter = vi.mocked(loadCharacterProduct);
const mockedAfter = vi.mocked(after);
const mockedRecord = vi.mocked(recordInvokedProfile);
const source = { kind: "mock" as const, getProfile: vi.fn() };

describe("CharacterSheet (the slow, streamed part of the route)", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
    mockedAfter.mockReset();
    mockedRecord.mockClear();
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

  describe("unique-profile counter", () => {
    const product = (username: string) => ({
      character: { identity: { username }, progression: { level: 1 } } as unknown as RPGCharacter,
      chronicle: {} as unknown as DeveloperChronicle,
      classExplanation: {} as unknown as ClassExplanation,
      presentation: { v2Enabled: false, delivery: "unavailable" as const, v2: null },
    });
    const flushScheduled = async () => {
      for (const [task] of mockedAfter.mock.calls) await (task as () => Promise<unknown>)();
    };

    it("registers a valid sheet for an interactive visitor, off the render path, by the canonical login", async () => {
      mockedLoadCharacter.mockResolvedValueOnce(product("Torvalds"));
      await CharacterSheet({ username: "torvalds", source, countInvocation: true });

      expect(mockedRecord).not.toHaveBeenCalled(); // only scheduled so far: rendering did not wait for it
      expect(mockedAfter).toHaveBeenCalledTimes(1);
      await flushScheduled();
      expect(mockedRecord).toHaveBeenCalledExactlyOnceWith("Torvalds");
    });

    it("does not register bots, crawlers and previews (the page passes countInvocation=false)", async () => {
      mockedLoadCharacter.mockResolvedValueOnce(product("torvalds"));
      await CharacterSheet({ username: "torvalds", source, countInvocation: false });
      mockedLoadCharacter.mockResolvedValueOnce(product("torvalds"));
      await CharacterSheet({ username: "torvalds", source });

      await flushScheduled();
      expect(mockedAfter).not.toHaveBeenCalled();
      expect(mockedRecord).not.toHaveBeenCalled();
    });

    it("does not register a 404, an invalid username or a failed sheet", async () => {
      for (const failure of [
        new ProfileNotFoundError("ghost"),
        new InvalidUsernameError(),
        new GitHubUnavailableError("network"),
        new GitHubRateLimitError("secondary", null, 0),
        new Error("boom"),
      ]) {
        mockedLoadCharacter.mockRejectedValueOnce(failure);
        await CharacterSheet({ username: "ghost", source, countInvocation: true }).catch(() => undefined);
      }

      await flushScheduled();
      expect(mockedAfter).not.toHaveBeenCalled();
      expect(mockedRecord).not.toHaveBeenCalled();
    });

    it("keeps the sheet working when the counter cannot even be scheduled", async () => {
      mockedAfter.mockImplementation(() => {
        throw new Error("after() called outside a request scope");
      });
      mockedLoadCharacter.mockResolvedValueOnce(product("torvalds"));

      await expect(CharacterSheet({ username: "torvalds", source, countInvocation: true })).resolves.toMatchObject({
        props: { username: "torvalds" },
      });
    });
  });
});
