// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { loadCharacter } from "@/data/loadCharacter";
import { GET } from "./route";

vi.mock("@/data/loadCharacter", () => ({
  loadCharacter: vi.fn(),
}));

const mockedLoadCharacter = vi.mocked(loadCharacter);

describe("GET /api/characters/[username]", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
  });

  it("returns 404 for a missing profile and never returns an RPGCharacter", async () => {
    mockedLoadCharacter.mockRejectedValueOnce(new ProfileNotFoundError("ghrpg-no-such-user-20261006-847291"));

    const response = await GET(new Request("http://localhost/api/characters/ghost"), {
      params: Promise.resolve({ username: "ghrpg-no-such-user-20261006-847291" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: "not_found",
        message: 'Aventureiro "ghrpg-no-such-user-20261006-847291" não foi encontrado nos reinos do código (404).',
      },
    });
    expect(body.identity).toBeUndefined();
    expect(body.progression).toBeUndefined();
  });
});
