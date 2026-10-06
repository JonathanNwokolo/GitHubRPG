import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { fetchHeroes } from "@/data/api/fetchHeroes";
import type { HeroCategoryId } from "./featuredHeroes";
import type { HeroSummary, HeroesResponse } from "./heroSummary";
import { AUTO_RETRY_DELAYS_MS, useHeroCategory } from "./useHeroCategory";

vi.mock("@/data/api/fetchHeroes", () => ({ fetchHeroes: vi.fn() }));

const mockedFetch = vi.mocked(fetchHeroes);
const [FIRST_DELAY, SECOND_DELAY] = AUTO_RETRY_DELAYS_MS;

function hero(username: string): HeroSummary {
  return { username, displayName: username, level: 10, className: "Mago", starsReceived: 1 };
}

function answer(category: HeroCategoryId, count: number, failed = 0): HeroesResponse {
  const pending = 5 - count - failed;
  return {
    category,
    heroes: Array.from({ length: count }, (_, index) => hero(`${category}${index}`)),
    requested: 5,
    failed,
    pending,
    partial: failed + pending > 0,
  };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function mockAnswers(...counts: number[]) {
  counts.forEach((count) => mockedFetch.mockResolvedValueOnce(answer("web", count)));
}

function callsFor(category: HeroCategoryId): number {
  return mockedFetch.mock.calls.filter(([requested]) => requested === category).length;
}

describe("useHeroCategory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedFetch.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("0 heroes + pending: stays out of the skeleton and asks again by itself", async () => {
    mockAnswers(0, 2);
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(0);

    expect(result.current.status).toBe("ready");
    expect(result.current.data?.heroes).toHaveLength(0);
    expect(result.current.updating).toBe(true);
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    await advance(FIRST_DELAY - 1);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(result.current.data?.heroes).toHaveLength(2);
  });

  it("2 heroes + pending: the cards stay visible while the retry runs", async () => {
    let release!: (value: HeroesResponse) => void;
    mockedFetch
      .mockResolvedValueOnce(answer("web", 2))
      .mockImplementationOnce(() => new Promise<HeroesResponse>((resolve) => (release = resolve)));
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(FIRST_DELAY);

    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
    expect(result.current.data?.heroes).toHaveLength(2);
    expect(result.current.refreshing).toBe(true);

    await act(async () => release(answer("web", 4)));
    expect(result.current.data?.heroes).toHaveLength(4);
    expect(result.current.refreshing).toBe(false);
  });

  it("stops asking as soon as pending reaches 0", async () => {
    mockAnswers(0, 5);
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(FIRST_DELAY);

    expect(result.current.data?.pending).toBe(0);
    expect(result.current.updating).toBe(false);
    await advance(60_000);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("makes at most two automatic retries", async () => {
    mockAnswers(0, 1, 2);
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(FIRST_DELAY);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    await advance(SECOND_DELAY);
    expect(mockedFetch).toHaveBeenCalledTimes(3);

    await advance(120_000);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(result.current.updating).toBe(false);
    expect(result.current.data?.pending).toBe(3);
  });

  it("does not auto-retry a category that only has failures (pending 0)", async () => {
    mockedFetch.mockResolvedValueOnce(answer("web", 3, 2));
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(120_000);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(result.current.data?.failed).toBe(2);
    expect(result.current.updating).toBe(false);
  });

  it("clears the timer when the category changes: the old category is never asked again", async () => {
    mockedFetch.mockImplementation(async (category) => answer(category, 1));
    const { result, rerender } = renderHook(({ category }) => useHeroCategory(category), {
      initialProps: { category: "web" as HeroCategoryId },
    });
    await advance(0);
    expect(vi.getTimerCount()).toBe(1);

    rerender({ category: "brazil" });
    await advance(0);
    expect(result.current.data?.category).toBe("brazil");
    await advance(FIRST_DELAY);
    expect(callsFor("web")).toBe(1);
    expect(callsFor("brazil")).toBe(2);
  });

  it("clears the timer on unmount", async () => {
    mockAnswers(1);
    const { unmount } = renderHook(() => useHeroCategory("web"));
    await advance(0);
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await advance(120_000);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("manual retry cancels the automatic timer, runs now and starts a new automatic attempt", async () => {
    mockAnswers(1, 2, 3);
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(1_000);

    await act(async () => result.current.retry());
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(result.current.data?.heroes).toHaveLength(2);

    await advance(FIRST_DELAY - 1);
    expect(mockedFetch).toHaveBeenCalledTimes(2); // the old timer did not fire
    await advance(1);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it("manual retry while a request is in flight does not start a second one", async () => {
    mockedFetch.mockImplementation(() => new Promise<HeroesResponse>(() => {}));
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(0);

    act(() => result.current.retry());
    act(() => result.current.retry());
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("remembers only complete categories: a partial one is asked again on return", async () => {
    mockedFetch.mockImplementation(async (category) => (category === "web" ? answer("web", 2) : answer("brazil", 5)));
    const { result, rerender } = renderHook(({ category }) => useHeroCategory(category), {
      initialProps: { category: "web" as HeroCategoryId },
    });
    await advance(0);
    rerender({ category: "brazil" });
    await advance(0);
    rerender({ category: "web" });
    await advance(0);
    rerender({ category: "brazil" });
    await advance(0);

    expect(result.current.data?.heroes).toHaveLength(5);
    expect(callsFor("web")).toBe(2);
    expect(callsFor("brazil")).toBe(1);
  });

  it("waits while the tab is hidden and resumes when it becomes visible", async () => {
    let visibility: DocumentVisibilityState = "hidden";
    const spy = vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    mockAnswers(1, 2);
    renderHook(() => useHeroCategory("web"));
    await advance(FIRST_DELAY + 20_000);
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("keeps the heroes already shown when an automatic retry fails", async () => {
    mockedFetch.mockResolvedValueOnce(answer("web", 2)).mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(FIRST_DELAY);

    expect(result.current.status).toBe("ready");
    expect(result.current.data?.heroes).toHaveLength(2);
    expect(result.current.updating).toBe(true); // one automatic attempt is still available
  });

  it("a first load that fails is an error with a manual retry, not an endless loop", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("raw")).mockResolvedValueOnce(answer("web", 5));
    const { result } = renderHook(() => useHeroCategory("web"));
    await advance(120_000);
    expect(result.current.status).toBe("error");
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    await act(async () => result.current.retry());
    expect(result.current.status).toBe("ready");
    expect(result.current.data?.heroes).toHaveLength(5);
  });
});
