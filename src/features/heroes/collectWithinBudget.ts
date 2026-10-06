export type BudgetSlot<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected" }
  | { status: "pending" };

export interface BudgetOutcome<T> {
  /** One slot per task, in the original order: what had settled when the budget ended. */
  slots: BudgetSlot<T>[];
  /** Resolves, and never rejects, once every task has settled. Hand it to `after()` to let slow tasks finish. */
  settled: Promise<void>;
  pending: number;
}

/**
 * Waits for every task, but for at most `budgetMs`. Tasks still running when the budget ends are NOT cancelled:
 * they stay `pending` in the snapshot and `settled` tells when they are all done.
 * Every rejection is consumed here, so a slow failure after the budget is never an unhandled rejection.
 */
export async function collectWithinBudget<T>(tasks: readonly Promise<T>[], budgetMs: number): Promise<BudgetOutcome<T>> {
  const slots: BudgetSlot<T>[] = tasks.map(() => ({ status: "pending" }));
  const settled = Promise.all(
    tasks.map((task, index) =>
      task.then(
        (value) => {
          slots[index] = { status: "fulfilled", value };
        },
        () => {
          slots[index] = { status: "rejected" };
        }
      )
    )
  ).then(() => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, budgetMs);
  });
  await Promise.race([settled, expired]);
  clearTimeout(timer);

  const snapshot = slots.slice();
  return { slots: snapshot, settled, pending: snapshot.filter((slot) => slot.status === "pending").length };
}
