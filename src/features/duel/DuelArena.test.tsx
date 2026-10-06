import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fetchCharacter } from "@/data/api/fetchCharacter";
import { createRPGCharacter } from "@/game/createCharacter";
import { getAvatarFrameForUsername } from "@/features/avatar";
import { useUiStore } from "@/stores/useUiStore";
import { makeAverageProfile } from "@/test/builders";
import { DuelArena } from "./DuelArena";

vi.mock("@/data/api/fetchCharacter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/api/fetchCharacter")>()),
  fetchCharacter: vi.fn(),
}));

const mockedFetchCharacter = vi.mocked(fetchCharacter);

describe("DuelArena avatars", () => {
  beforeEach(() => {
    useUiStore.setState({ language: "pt-BR", reducedMotion: "reduced" });
    mockedFetchCharacter.mockImplementation(async (username) =>
      createRPGCharacter(makeAverageProfile({
        username,
        // Hero B has no photo: it must still render, with initials.
        avatarUrl: username === "alpha" ? `https://avatars.example/${username}` : undefined,
      }))
    );
  });

  it("shows each fighter in the same frame the rest of the site gives them", async () => {
    const { container } = render(<DuelArena heroA="alpha" heroB="Beta" />);
    await screen.findAllByRole("heading", { level: 2 });
    await waitFor(() => expect(container.querySelectorAll("[data-avatar-frame]")).toHaveLength(2));

    const frames = [...container.querySelectorAll("[data-avatar-frame]")].map((el) => el.getAttribute("data-avatar-frame"));
    expect(frames).toEqual([getAvatarFrameForUsername("alpha").id, getAvatarFrameForUsername("Beta").id]);
  });

  it("falls back to initials when a fighter has no photo", async () => {
    render(<DuelArena heroA="alpha" heroB="beta" />);
    expect(await screen.findByText("BE")).toBeInTheDocument();
  });
});
