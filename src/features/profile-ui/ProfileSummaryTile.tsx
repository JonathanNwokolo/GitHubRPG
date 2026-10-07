import React from "react";
import "./profile-ui.css";

interface ProfileSummaryTileProps {
  value: string;
  label: string;
  /** Tooltip for figures that are partial or estimated. */
  hint?: string;
}

/** A figure of the journey: big number, short label, on the kit's rune plate. */
export function ProfileSummaryTile({ value, label, hint }: ProfileSummaryTileProps) {
  return (
    <li title={hint} className="pf-tile">
      <p className="max-w-full break-words font-pixel text-sm leading-tight text-amber-100 sm:text-base">{value}</p>
      <p className="pf-muted mt-2 font-sans text-[10px] font-semibold uppercase leading-tight tracking-wide sm:text-[11px]">
        {label}
      </p>
    </li>
  );
}
