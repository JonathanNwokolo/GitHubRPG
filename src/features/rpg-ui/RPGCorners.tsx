import React from "react";
import { clsx } from "clsx";
import "./rpg-ui.css";

export type RPGCornerVariant = "legendary" | "standard";

interface RPGCornersProps {
  variant?: RPGCornerVariant;
  className?: string;
}

/**
 * Four decorative corners from one image (mirrored with CSS). Put it inside a `relative` parent;
 * it never takes clicks and never changes the parent's layout.
 */
export function RPGCorners({ variant = "standard", className }: RPGCornersProps) {
  return (
    <span aria-hidden="true" className={clsx("rpg-corners", `rpg-corners--${variant}`, className)}>
      <span className="rpg-corner rpg-corner--tl" />
      <span className="rpg-corner rpg-corner--tr" />
      <span className="rpg-corner rpg-corner--bl" />
      <span className="rpg-corner rpg-corner--br" />
    </span>
  );
}
