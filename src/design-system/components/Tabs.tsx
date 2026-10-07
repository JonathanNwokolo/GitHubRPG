"use client";

import React, { useId, useRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { playClickSound } from "@/lib/audio/soundEffects";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  /**
   * Prefix of the DOM ids (`{prefix}-tab-{id}` / `{prefix}-panel-{id}`). Pass the same value to
   * `TabPanel` so tab and panel reference each other. Defaults to a unique id per instance.
   */
  idPrefix?: string;
  /** Accessible name of the tab list. */
  "aria-label"?: string;
  /** Replaces the default look (list and tab classes); behavior and ARIA stay the same. */
  appearance?: {
    list: string;
    tab: (active: boolean) => string;
    /** Classes of the counter badge; without it the default badge look is kept. */
    badge?: (active: boolean) => string;
  };
}

/** DOM id of a tab button. */
export function tabDomId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`;
}

/** DOM id of a tab's panel. */
export function tabPanelDomId(prefix: string, id: string): string {
  return `${prefix}-panel-${id}`;
}

export interface TabPanelProps {
  idPrefix: string;
  /** The id of the tab this panel belongs to (same as `TabItem.id`). */
  tabId: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * The panel of the active tab. Only the active panel is mounted, so `Tabs` points `aria-controls`
 * at it only while it is the active one (an inactive tab never references a missing element).
 */
export const TabPanel: React.FC<TabPanelProps> = ({ idPrefix, tabId, children, className }) => (
  <div
    role="tabpanel"
    id={tabPanelDomId(idPrefix, tabId)}
    aria-labelledby={tabDomId(idPrefix, tabId)}
    tabIndex={0}
    className={twMerge(
      clsx(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void",
        className
      )
    )}
  >
    {children}
  </div>
);

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onTabChange,
  className,
  idPrefix,
  "aria-label": ariaLabel,
  appearance,
}) => {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % items.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = items.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabsRef.current[nextIndex]?.focus();
    onTabChange(items[nextIndex].id);
    playClickSound();
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      aria-label={ariaLabel}
      className={twMerge(
        clsx(
          appearance?.list ?? "flex flex-wrap items-center gap-1.5 p-1 bg-rpg-void border-2 border-rpg-border",
          className
        )
      )}
    >
      {items.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabsRef.current[idx] = el;
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={isActive ? tabPanelDomId(prefix, tab.id) : undefined}
            id={tabDomId(prefix, tab.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              playClickSound();
              onTabChange(tab.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={
              appearance
                ? appearance.tab(isActive)
                : twMerge(
                    clsx(
                      "flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-sans font-bold uppercase tracking-wider transition-all duration-150 border min-h-[44px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void",
                      isActive
                        ? "bg-rpg-surface text-rpg-gold border-rpg-goldDark shadow-pixel font-extrabold"
                        : "bg-transparent text-slate-300 border-transparent hover:text-white hover:bg-rpg-surface/60"
                    )
                  )
            }
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={
                  appearance?.badge
                    ? appearance.badge(isActive)
                    : clsx(
                        "px-2 py-0.5 text-xs font-mono font-bold border",
                        isActive
                          ? "bg-rpg-goldDark text-slate-950 border-amber-300"
                          : "bg-slate-800 text-slate-200 border-slate-700"
                      )
                }
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
