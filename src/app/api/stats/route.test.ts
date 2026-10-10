// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readInvokedProfileCount } from "@/data/usage/invokedProfiles";
import { createFakeUpstash, FAKE_USAGE_CONFIG } from "@/data/usage/testing/fakeUpstash";
import { GET } from "./route";

vi.mock("@/data/usage/invokedProfiles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/data/usage/invokedProfiles")>()),
  readInvokedProfileCount: vi.fn(),
}));
const mockedCount = vi.mocked(readInvokedProfileCount);

describe("GET /api/stats", () => {
  beforeEach(() => mockedCount.mockReset());

  it("returns the Redis Set cardinality and nothing else, cacheable by the CDN", async () => {
    mockedCount.mockResolvedValueOnce(1284);
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ uniqueProfilesInvoked: 1284 });
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=300, stale-while-revalidate=600");
  });

  it("answers null with HTTP 200 (never a 5xx) when the total is unknown", async () => {
    mockedCount.mockResolvedValueOnce(null);
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ uniqueProfilesInvoked: null });
    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=60");
  });

  it("reports SCARD from the store, and null (still 200) when the store is down", async () => {
    const actual = await vi.importActual<typeof import("@/data/usage/invokedProfiles")>("@/data/usage/invokedProfiles");
    const redis = createFakeUpstash();
    for (const name of ["a", "b", "c"]) {
      await actual.recordInvokedProfile(name, { config: FAKE_USAGE_CONFIG, fetch: redis.fetch, knownIds: new Set() });
    }
    mockedCount.mockImplementation(() => actual.readInvokedProfileCount({ config: FAKE_USAGE_CONFIG, fetch: redis.fetch }));

    expect(await (await GET()).json()).toEqual({ uniqueProfilesInvoked: 3 });

    redis.state.failure = "network";
    const failed = await GET();
    expect(failed.status).toBe(200);
    expect(await failed.json()).toEqual({ uniqueProfilesInvoked: null });
  });
});
