import React from "react";
import { clsx } from "clsx";

/** Entries beyond this share one animation delay, so a long journey never makes the reader wait. */
const MAX_STAGGER_STEPS = 8;
const STAGGER_MS = 60;

export function staggerStyle(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` };
}

/**
 * The vertical line of the timeline, drawn per entry so it stays continuous without measuring anything.
 * It runs from the first medallion to the last one and no further. `compact` matches the small medallion.
 */
export const TimelineRail: React.FC<{ isFirst: boolean; isLast: boolean; compact?: boolean }> = ({
  isFirst,
  isLast,
  compact = false,
}) => (
  <span
    aria-hidden="true"
    className={clsx("absolute left-0 top-0 bottom-0 flex justify-center pointer-events-none", compact ? "w-7" : "w-9")}
  >
    <span
      className={clsx(
        "w-px bg-gradient-to-b from-rpg-goldDark/70 to-rpg-borderLight",
        isFirst ? (compact ? "mt-3.5" : "mt-4") : "mt-0",
        isLast ? (compact ? "h-3.5" : "h-4") : "h-full"
      )}
    />
  </span>
);
