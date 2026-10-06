import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectWithinBudget } from "./collectWithinBudget";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("collectWithinBudget", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns as soon as every task settles, without waiting for the budget", async () => {
    const outcome = await collectWithinBudget([Promise.resolve(1), Promise.reject(new Error("x")), Promise.resolve(3)], 7_000);
    expect(outcome.slots).toEqual([{ status: "fulfilled", value: 1 }, { status: "rejected" }, { status: "fulfilled", value: 3 }]);
    expect(outcome.pending).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives up on slow tasks at the budget, keeps order, and lets them finish afterwards", async () => {
    const slow = deferred<string>();
    const pendingOutcome = collectWithinBudget([Promise.resolve("a"), slow.promise, Promise.resolve("c")], 7_000);
    await vi.advanceTimersByTimeAsync(7_000);
    const outcome = await pendingOutcome;

    expect(outcome.slots.map((slot) => slot.status)).toEqual(["fulfilled", "pending", "fulfilled"]);
    expect(outcome.pending).toBe(1);

    slow.resolve("b");
    await outcome.settled;
    expect(outcome.slots[1].status).toBe("pending"); // the answer already given is a snapshot
  });

  it("consumes a rejection that happens after the budget (no unhandled rejection)", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const slow = deferred<string>();
    const pendingOutcome = collectWithinBudget([slow.promise], 1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    const outcome = await pendingOutcome;

    slow.reject(new Error("late failure"));
    await expect(outcome.settled).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(10);
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
