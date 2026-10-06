// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { loadCharacterWithChronicle } from "@/data/loadCharacter";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import type { RPGCharacter } from "@/game/types";
import CharacterPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/data/loadCharacter", () => ({
  loadCharacterWithChronicle: vi.fn(),
}));

vi.mock("./CharacterPageClient", () => ({
  default: (props: unknown) => ({ type: "CharacterPageClient", props }),
}));

const mockedLoadCharacter = vi.mocked(loadCharacterWithChronicle);

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
    const chronicle = { adventurerName: "Linus", coverage: "full" };
    mockedLoadCharacter.mockResolvedValueOnce({
      character: character as unknown as RPGCharacter,
      chronicle: chronicle as unknown as DeveloperChronicle,
    });

    await expect(CharacterPage({ params: Promise.resolve({ username: "torvalds" }) })).resolves.toMatchObject({
      props: {
        character,
        chronicle,
        username: "torvalds",
      },
    });
  });

  it("generates OpenGraph and Twitter metadata pointing to the card image route", async () => {
    const { generateMetadata } = await import("./page");
    const meta = await generateMetadata({ params: Promise.resolve({ username: "octocat" }) });

    expect(meta.openGraph?.images).toEqual([
      {
        url: "/api/card/octocat",
        width: 1200,
        height: 630,
        alt: "Cartão de Herói de @octocat - GitHub RPG",
      },
    ]);
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["/api/card/octocat"],
    });
  });
});
