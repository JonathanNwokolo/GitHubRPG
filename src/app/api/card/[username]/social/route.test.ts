// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileNotFoundError } from "@/data/contracts";
import { loadCharacterProduct, type LoadedCharacterProduct } from "@/data/loadCharacter";
import { buildActivityFlame } from "@/features/activity-flame/buildActivityFlame";
import { calendarOf, sparseYear } from "@/features/activity-flame/testing/fixtures";
import { buildDeveloperChronicle } from "@/features/chronicle/buildDeveloperChronicle";
import { createRPGCharacter } from "@/game/createCharacter";
import { createCharacterPresentationModel } from "@/game-v2/publicProjection";
import { m, makeAverageProfile } from "@/test/builders";
import { GET } from "./route";

vi.mock("@/data/loadCharacter", () => ({
  loadCharacterProduct: vi.fn(),
}));

const mockedLoad = vi.mocked(loadCharacterProduct);

const FLAME = buildActivityFlame({
  calendar: calendarOf({ 2026: sparseYear(2026, { "2026-09-01": 3, "2026-09-02": 1 }, "2026-10-09") }),
  createdAt: "2019-02-14T00:00:00Z",
  referenceDate: "2026-10-09T00:00:00Z",
});

function product(overrides: Partial<LoadedCharacterProduct> = {}, username = "test-hero"): LoadedCharacterProduct {
  const profile = makeAverageProfile({ username, displayName: "Herói dos Códigos" });
  const character = createRPGCharacter(profile);
  return {
    character,
    chronicle: buildDeveloperChronicle(profile),
    activityFlame: FLAME,
    classExplanation: {} as LoadedCharacterProduct["classExplanation"],
    presentation: createCharacterPresentationModel(false),
    ...overrides,
  };
}

async function call(path: string, username = "test-hero") {
  return GET(new Request(`http://localhost${path}`), { params: Promise.resolve({ username }) });
}

/** width and height from a PNG's IHDR chunk. */
function pngSize(bytes: ArrayBuffer): { width: number; height: number } {
  const view = new DataView(bytes);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

beforeEach(() => {
  mockedLoad.mockReset();
});

describe("GET /api/card/[username]/social", () => {
  it("is a 1080 x 1350 PNG for a complete sheet, cached like the other cards", async () => {
    mockedLoad.mockResolvedValueOnce(product());

    const response = await call("/api/card/test-hero/social");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("s-maxage=900");
    const bytes = await response.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(pngSize(bytes)).toEqual({ width: 1080, height: 1350 });
  });

  it("renders in English, with a title pick, and without a calendar", async () => {
    mockedLoad.mockResolvedValueOnce(product({ activityFlame: undefined }));
    const response = await call("/api/card/test-hero/social?lang=en&title=title-years-5");

    expect(response.status).toBe(200);
    expect(pngSize(await response.arrayBuffer())).toEqual({ width: 1080, height: 1350 });
  });

  it("ignores a malformed title id instead of failing", async () => {
    mockedLoad.mockResolvedValueOnce(product());
    const response = await call(`/api/card/test-hero/social?title=${encodeURIComponent("<script>alert(1)</script>")}`);
    expect(response.status).toBe(200);
  });

  it("does not render a degraded card for a partial sheet: 503, never cached", async () => {
    const partial = createRPGCharacter(makeAverageProfile({ username: "test-hero", commits: m(0, "unavailable") }));
    mockedLoad.mockResolvedValueOnce(product({ character: partial }));

    const response = await call("/api/card/test-hero/social");

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).not.toBe("image/png");
    expect(response.headers.get("retry-after")).toBeNull();
  });

  it("answers 503 with Retry-After, never cached, while V2 is still being resolved", async () => {
    mockedLoad.mockResolvedValueOnce(
      product({ presentation: createCharacterPresentationModel(true, { state: "enriching", character: null }) })
    );

    const response = await call("/api/card/test-hero/social");

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("5");
  });

  it("reads the product from cache only: it never asks the loader to schedule an enrichment", async () => {
    mockedLoad.mockResolvedValueOnce(product());
    await call("/api/card/test-hero/social");

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(mockedLoad.mock.calls[0][0]).toBe("test-hero");
    expect(mockedLoad.mock.calls[0][2]).toBeUndefined();
  });

  it("is a 404 for a missing profile", async () => {
    mockedLoad.mockRejectedValueOnce(new ProfileNotFoundError("ghost-user"));
    const response = await call("/api/card/ghost-user/social", "ghost-user");
    expect(response.status).toBe(404);
  });

  it("is a 400 for an empty or malformed username", async () => {
    expect((await call("/api/card/%20/social", "   ")).status).toBe(400);
    expect((await call("/api/card/%E0%A4%A/social", "%E0%A4%A")).status).toBe(400);
    expect(mockedLoad).not.toHaveBeenCalled();
  });
});
