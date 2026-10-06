import React from "react";
import { RpgIconFrame, RpgCalendar, RpgGitCommit, RpgMana, RpgShield } from "@/design-system";
import type { SummaryItemView } from "./chronicleText";

const SUMMARY_ICON: Record<SummaryItemView["id"], React.ReactNode> = {
  journeyLength: <RpgCalendar className="w-3.5 h-3.5 text-emerald-400" />,
  mostActiveYear: <RpgMana className="w-3.5 h-3.5 text-red-400" />,
  longestStreak: <RpgShield className="w-3.5 h-3.5 text-cyan-400" />,
  totalContributions: <RpgGitCommit className="w-3.5 h-3.5 text-amber-400" />,
};

const SUMMARY_RARITY = {
  journeyLength: "emerald",
  mostActiveYear: "crimson",
  longestStreak: "azure",
  totalContributions: "gold",
} as const;

/** One figure of the journey: icon, highlighted value, small label. Horizontal, so it stays short. */
export const ChronicleStat: React.FC<{ item: SummaryItemView }> = ({ item }) => (
  <li className="flex items-center gap-3 min-w-0">
    <RpgIconFrame size="sm" shape="slate" rarity={SUMMARY_RARITY[item.id]} glow className="shrink-0" aria-hidden="true">
      {SUMMARY_ICON[item.id]}
    </RpgIconFrame>
    <div className="min-w-0">
      <p className="font-pixel text-xs sm:text-sm text-amber-400 uppercase leading-snug break-words">{item.value}</p>
      <p className="font-sans text-xs text-slate-300 leading-tight">{item.label}</p>
    </div>
  </li>
);
