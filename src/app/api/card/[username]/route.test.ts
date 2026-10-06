// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { loadCharacter } from "@/data/loadCharacter";
import { createRPGCharacter } from "@/game/createCharacter";
import { makeAverageProfile, makeProfile } from "@/test/builders";
import { GET } from "./route";

vi.mock("@/data/loadCharacter", () => ({
  loadCharacter: vi.fn(),
}));

const mockedLoadCharacter = vi.mocked(loadCharacter);

describe("GET /api/card/[username]", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
  });

  it("returns 404 for a missing profile", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new ProfileNotFoundError("ghost-user"));

    const response = await GET(new Request("http://localhost/api/card/ghost-user"), {
      params: Promise.resolve({ username: "ghost-user" }),
    });

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toContain("404");
  });

  it("returns 400 for an empty username", async () => {
    const response = await GET(new Request("http://localhost/api/card/%20"), {
      params: Promise.resolve({ username: "   " }),
    });

    expect(response.status).toBe(400);
  });

  it("returns a valid PNG image for an existing user", async () => {
    const character = createRPGCharacter(
      makeAverageProfile({
        username: "test-hero",
        displayName: "Herói dos Códigos",
      })
    );
    mockedLoadCharacter.mockResolvedValueOnce(character);

    const response = await GET(new Request("http://localhost/api/card/test-hero"), {
      params: Promise.resolve({ username: "test-hero" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");

    const arrayBuffer = await response.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  it("handles empty profile without crashing or failing", async () => {
    const character = createRPGCharacter(
      makeProfile({
        username: "empty-dev",
        languages: [],
      })
    );
    mockedLoadCharacter.mockResolvedValueOnce(character);

    const response = await GET(new Request("http://localhost/api/card/empty-dev"), {
      params: Promise.resolve({ username: "empty-dev" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const arrayBuffer = await response.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  it("uses unlocked custom title from query param if provided", async () => {
    const character = createRPGCharacter(makeAverageProfile({ username: "titled-dev" }));
    mockedLoadCharacter.mockResolvedValueOnce(character);

    // Find any unlocked title name in character
    const unlockedTitle = character.titles.find((t) => t.unlocked)?.name || "Caçador";

    const response = await GET(
      new Request(`http://localhost/api/card/titled-dev?title=${encodeURIComponent(unlockedTitle)}`),
      {
        params: Promise.resolve({ username: "titled-dev" }),
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
