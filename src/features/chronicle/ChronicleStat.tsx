import React from "react";
import { RpgCalendar, RpgGitCommit, RpgMana, RpgShield } from "@/design-system";
import type { SummaryItemView } from "./chronicleText";

const SUMMARY_ICON: Record<SummaryItemView["id"], React.ReactNode> = {
  journeyLength: <RpgCalendar className="h-4 w-4 text-emerald-400" />,
  mostActiveYear: <RpgMana className="h-4 w-4 text-red-400" />,
  longestStreak: <RpgShield className="h-4 w-4 text-cyan-400" />,
  totalContributions: <RpgGitCommit className="h-4 w-4 text-amber-400" />,
};

/** One figure of the journey: small icon, highlighted value, small label. Centered, so the strip reads as a row of medals. */
export const ChronicleStat: React.FC<{ item: SummaryItemView }> = ({ item }) => (
  <li className="flex min-w-0 flex-col items-center gap-1 text-center lg:border-l lg:border-amber-900/40 lg:first:border-l-0">
    <span aria-hidden="true">{SUMMARY_ICON[item.id]}</span>
    <p className="break-words font-pixel text-xs uppercase leading-snug text-amber-300 sm:text-sm">{item.value}</p>
    <p className="pf-muted font-sans text-xs leading-tight">{item.label}</p>
  </li>
);
