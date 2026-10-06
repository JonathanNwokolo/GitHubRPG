// @vitest-environment node
import React, { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { GitHubRateLimitError, GitHubUnavailableError, InvalidUsernameError } from "@/data/github/errors";
import { loadCharacterWithChronicle } from "@/data/loadCharacter";
import CharacterPage from "./page";
import CharacterSheet from "./CharacterSheet";
import { CharacterLoading } from "./CharacterLoading";

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

const { source } = vi.hoisted(() => ({
  source: { kind: "mock" as const, getProfile: vi.fn(), ensureProfileExists: vi.fn() },
}));

vi.mock("@/data/datasource", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/datasource")>()),
  createDataSource: () => source,
}));

const mockedLoadCharacter = vi.mocked(loadCharacterWithChronicle);
const params = (username: string) => ({ params: Promise.resolve({ username }) });

describe("/[username] page: existence is decided before anything streams", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
    source.ensureProfileExists.mockReset();
    source.getProfile.mockReset();
  });

  it("turns a missing GitHub profile into Next's real 404 boundary", async () => {
    source.ensureProfileExists.mockRejectedValueOnce(new ProfileNotFoundError("ghrpg-no-such-user-20261006-847291"));

    await expect(CharacterPage(params("ghrpg-no-such-user-20261006-847291"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockedLoadCharacter).not.toHaveBeenCalled();
  });

  it("turns an invalid username into the real 404 boundary too", async () => {
    source.ensureProfileExists.mockRejectedValueOnce(new InvalidUsernameError());

    await expect(CharacterPage(params("not a user!"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("does NOT turn GitHub failures into a 404: they reach the error boundary", async () => {
    const failures = [
      new GitHubUnavailableError("upstream", 503),
      new GitHubRateLimitError("primary", null, 0),
      new Error("boom"),
    ];

    for (const failure of failures) {
      source.ensureProfileExists.mockRejectedValueOnce(failure);
      const error = await CharacterPage(params("torvalds")).catch((e: unknown) => e);
      expect(error).toBe(failure);
      expect((error as Error).message).not.toBe("NEXT_NOT_FOUND");
    }
  });

  it("for an existing profile it returns the themed skeleton as the Suspense fallback of the sheet", async () => {
    source.ensureProfileExists.mockResolvedValueOnce(undefined);

    const tree = (await CharacterPage(params("torvalds"))) as React.ReactElement<{
      fallback: React.ReactElement;
      children: React.ReactElement<{ username: string; source: unknown }>;
    }>;

    expect(tree.type).toBe(Suspense);
    expect(tree.props.fallback.type).toBe(CharacterLoading);
    expect(tree.props.children.type).toBe(CharacterSheet);
    expect(tree.props.children.props).toMatchObject({ username: "torvalds", source });
    // The slow load happens inside the Suspense, not before it.
    expect(mockedLoadCharacter).not.toHaveBeenCalled();
  });

  it("works with a data source that has no fast existence check (the sheet still decides)", async () => {
    const original = source.ensureProfileExists;
    // @ts-expect-error simulate a source without the optional method
    source.ensureProfileExists = undefined;
    try {
      const tree = (await CharacterPage(params("torvalds"))) as React.ReactElement;
      expect(tree.type).toBe(Suspense);
    } finally {
      source.ensureProfileExists = original;
    }
  });

  it("generates OpenGraph and Twitter metadata pointing to the card image route on the site origin", async () => {
    const { generateMetadata } = await import("./page");
    const { getSiteOrigin } = await import("@/lib/siteUrl");
    const origin = getSiteOrigin();
    const meta = await generateMetadata({ params: Promise.resolve({ username: "octocat" }) });

    expect(meta.alternates?.canonical).toBe(`${origin}/octocat`);
    expect(meta.openGraph?.url).toBe(`${origin}/octocat`);
    expect(meta.openGraph?.images).toEqual([
      {
        url: `${origin}/api/card/octocat`,
        width: 1200,
        height: 630,
        alt: "Cartão de Herói de @octocat - GitHub RPG",
      },
    ]);
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      images: [`${origin}/api/card/octocat`],
    });
  });

  it("decodes the route parameter before building metadata", async () => {
    const { generateMetadata } = await import("./page");
    const meta = await generateMetadata({ params: Promise.resolve({ username: "Octo%2DCat" }) });

    expect(meta.title).toBe("@Octo-Cat | GitHub RPG");
  });
});
