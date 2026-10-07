import React from "react";
import { clsx } from "clsx";
import { Tabs, type TabsProps } from "@/design-system";
import "./rpg-ui.css";

/** Plate look for the shared `Tabs` (keyboard handling, ARIA and sounds stay in `Tabs`). */
const RPG_TAB_APPEARANCE: NonNullable<TabsProps["appearance"]> = {
  list: "flex flex-wrap items-center justify-center gap-x-1 gap-y-3",
  tab: (active) =>
    clsx(
      "rpg-tab font-sans text-[11px] font-bold uppercase tracking-wide sm:text-[13px] sm:tracking-wider",
      active && "rpg-tab--active"
    ),
};

export function RPGTabs(props: Omit<TabsProps, "appearance">) {
  return <Tabs {...props} appearance={RPG_TAB_APPEARANCE} />;
}
