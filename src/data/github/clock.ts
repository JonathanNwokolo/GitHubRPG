/**
 * The ONLY place in the data layer that reads the wall clock (architecture.test.ts enforces it).
 * Everything else receives `now` by injection, so tests control time.
 */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date(Date.now());
