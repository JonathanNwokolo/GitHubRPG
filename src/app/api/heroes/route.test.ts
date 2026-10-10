// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRPGCharacter } from "@/game/engine";
import { makeAverageProfile, m } from "@/test/builders";
import { loadCharacterProduct } from "@/data/loadCharacter";
import { HEROES_RESPONSE_BUDGET_MS } from "@/features/heroes/featuredHeroes";
import { GET } from "./route";

vi.mock("@/data/loadCharacter", () => ({ loadCharacterProduct: vi.fn() }));

const afterTasks: Promise<unknown>[] = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  // `after` only exists inside a real request; here it just records the post-response work.
  after: (task: Promise<unknown>) => {
    afterTasks.push(task);
  },
}));

const mockedLoadCharacter = vi.mocked(loadCharacterProduct);
const LEGENDS = ["torvalds", "gvanrossum", "matz", "antirez", "dhh"];
const COMPLETE_CACHE = "public, s-maxage=900, stale-while-revalidate=300";

function character(username: string) {
  const value = createRPGCharacter(
    makeAverageProfile({ username, displayName: `Hero ${username}`, avatarUrl: `https://avatars.example/${username}` })
  );
  return {
    character: value,
    chronicle: {} as never,
    classExplanation: {} as never,
    presentation: { v2Enabled: false, delivery: "unavailable" as const, v2: null },
  };
}

function request(category = "legends") {
  return new Request(`http://localhost/api/heroes?category=${category}`);
}

/** `fast` users answer at once, `failing` users throw, every other user waits for its own controller. */
function scenario({ fast = LEGENDS, failing = [] as string[] } = {}) {
  const late = new Map<string, { resolve: () => void; reject: () => void }>();
  mockedLoadCharacter.mockImplementation((username) => {
    if (failing.includes(username)) return Promise.reject(new Error("upstream failed: token ghp_SECRET"));
    if (fast.includes(username)) return Promise.resolve(character(username));
    return new Promise((resolve, reject) => {
      late.set(username, { resolve: () => resolve(character(username)), reject: () => reject(new Error("late failure")) });
    });
  });
  return late;
}

async function getAfterBudget(category?: string) {
  const pending = GET(request(category));
  await vi.advanceTimersByTimeAsync(HEROES_RESPONSE_BUDGET_MS);
  return pending;
}

describe("GET /api/heroes", () => {
  beforeEach(() => {
    mockedLoadCharacter.mockReset();
    afterTasks.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("5/5 before the budget: complete score order, shared cache, no post-response work", async () => {
    scenario();
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(COMPLETE_CACHE);
    expect(mockedLoadCharacter).toHaveBeenCalledTimes(5);
    expect(mockedLoadCharacter.mock.calls.every((call) => call.length === 2)).toBe(true);
    expect(body).toMatchObject({ category: "legends", requested: 5, failed: 0, pending: 0, partial: false });
    expect(body.heroes.map((hero: { username: string }) => hero.username)).toEqual([...LEGENDS].sort());
    expect(body.heroes[0]).toMatchObject({ displayName: "Hero antirez", level: expect.any(Number), className: expect.any(String) });
    expect(body.heroes[0].skills).toBeUndefined();
    expect(body.heroes[0].achievements).toBeUndefined();
    expect(afterTasks).toHaveLength(0);
  });

  it("4/5 with one failed profile answers at once, partial and not cached", async () => {
    scenario({ fast: ["torvalds", "gvanrossum", "antirez", "dhh"], failing: ["matz"] });
    const response = await GET(request());
    const body = await response.json();

    expect(body).toMatchObject({ requested: 5, failed: 1, pending: 0, partial: true });
    expect(body.heroes.map((hero: { username: string }) => hero.username)).toEqual(["antirez", "dhh", "gvanrossum", "torvalds"]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toMatch(/upstream failed|ghp_SECRET/);
    expect(afterTasks).toHaveLength(0);
  });

  it("keeps a partial profile out of competitive ordering", async () => {
    scenario();
    mockedLoadCharacter.mockImplementation(async (username) => {
      const product = character(username);
      return username === "matz"
        ? { ...product, character: createRPGCharacter(makeAverageProfile({ username, commits: m(0, "unavailable") })) }
        : product;
    });
    const response = await GET(request());
    const body = await response.json();
    expect(body.partial).toBe(true);
    expect(body.heroes).toHaveLength(4);
    expect(body.heroes.map((hero: { username: string }) => hero.username)).not.toContain("matz");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("3/5 at the budget: answers with the three that finished, in order, without waiting for the slow ones", async () => {
    const late = scenario({ fast: ["torvalds", "matz", "dhh"] });
    const response = await getAfterBudget();
    const body = await response.json();

    expect(body).toMatchObject({ requested: 5, failed: 0, pending: 2, partial: true });
    expect(body.heroes.map((hero: { username: string }) => hero.username)).toEqual(["dhh", "matz", "torvalds"]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect([...late.keys()].sort()).toEqual(["antirez", "gvanrossum"]);
  });

  it("0/5 at the budget: empty, partial, no-store", async () => {
    scenario({ fast: [] });
    const response = await getAfterBudget();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ heroes: [], requested: 5, failed: 0, pending: 5, partial: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("every profile failing is empty, partial and no-store", async () => {
    scenario({ fast: [], failing: LEGENDS });
    const response = await GET(request());
    const body = await response.json();

    expect(body).toMatchObject({ heroes: [], failed: 5, pending: 0, partial: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("hands the slow profiles to after() so they finish, and a late failure is not unhandled", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const late = scenario({ fast: ["torvalds", "gvanrossum", "matz", "antirez"] });
    const response = await getAfterBudget();
    expect((await response.json()).pending).toBe(1);

    expect(afterTasks).toHaveLength(1);
    let finished = false;
    void afterTasks[0].then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(finished).toBe(false);

    late.get("dhh")!.reject();
    await expect(afterTasks[0]).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(10);
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("a profile that finishes after the budget completes through after(), so the next call can be whole", async () => {
    const late = scenario({ fast: ["torvalds", "gvanrossum", "matz", "antirez"] });
    const first = await getAfterBudget();
    expect((await first.json()).partial).toBe(true);

    late.get("dhh")!.resolve();
    await afterTasks[0];

    // The data source now answers dhh from its cache: the same call is complete and cacheable.
    mockedLoadCharacter.mockImplementation(async (username) => character(username));
    const second = await GET(request());
    expect((await second.json())).toMatchObject({ partial: false, pending: 0 });
    expect(second.headers.get("cache-control")).toBe(COMPLETE_CACHE);
  });

  it("rejects unknown categories without loading a profile", async () => {
    const response = await GET(request("ranking"));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockedLoadCharacter).not.toHaveBeenCalled();
  });
});
