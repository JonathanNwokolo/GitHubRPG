// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { loadCharacter } from "@/data/loadCharacter";
import type { RPGCharacter } from "@/game/types";
import CharacterPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/data/loadCharacter", () => ({
  loadCharacter: vi.fn(),
}));

vi.mock("./CharacterPageClient", () => ({
  default: (props: unknown) => ({ type: "CharacterPageClient", props }),
}));

const mockedLoadCharacter = vi.mocked(loadCharacter);

describe("/[username] page", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
  });

  it("turns a missing GitHub profile into Next's real 404 boundary", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new ProfileNotFoundError("ghrpg-no-such-user-20261006-847291"));

    await expect(
      CharacterPage({ params: Promise.resolve({ username: "ghrpg-no-such-user-20261006-847291" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders a valid character from the server-loaded data", async () => {
    const character = { identity: { username: "torvalds" }, progression: { level: 58 } };
    mockedLoadCharacter.mockResolvedValueOnce(character as unknown as RPGCharacter);

    await expect(CharacterPage({ params: Promise.resolve({ username: "torvalds" }) })).resolves.toMatchObject({
      props: {
        character,
        username: "torvalds",
      },
    });
  });
});
