import React from "react";
import type { SummaryItemView } from "./chronicleText";
import { ChronicleStat } from "./ChronicleStat";

/** The figures of the whole journey, as one light strip (no card of its own). Unavailable figures never reach it. */
export const ChronicleSummary: React.FC<{ items: SummaryItemView[]; label: string }> = ({ items, label }) => (
  <ul
    aria-label={label}
    className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 py-3 border-y border-rpg-border/70"
  >
    {items.map((item) => (
      <ChronicleStat key={item.id} item={item} />
    ))}
  </ul>
);
