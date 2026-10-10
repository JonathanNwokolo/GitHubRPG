"use client";

import React, { useEffect, useRef } from "react";
import { clsx } from "clsx";

interface FlameYearPickerProps {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
  label: string;
  /** Prefix of the DOM ids: year `${year}` is `${idPrefix}-year-${year}`. */
  idPrefix: string;
}

/**
 * The "time travel" year picker: a single-choice group (radio semantics, so it is not mistaken for the sheet's tabs)
 * with automatic activation: the view switches instantly, from memory. Arrows, Home and End move between years.
 * A long history scrolls inside the strip, never the page.
 */
export const FlameYearPicker: React.FC<FlameYearPickerProps> = ({ years, selected, onSelect, label, idPrefix }) => {
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the selected year centered in the strip without ever moving the page itself.
  useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!strip || !tab) return;
    strip.scrollLeft = tab.offsetLeft - strip.clientWidth / 2 + tab.offsetWidth / 2;
  }, [selected]);

  const move = (nextIndex: number) => {
    const year = years[Math.min(years.length - 1, Math.max(0, nextIndex))];
    onSelect(year);
    stripRef.current?.querySelector<HTMLElement>(`[data-year="${year}"]`)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = years.indexOf(selected);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") move(current + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(current - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(years.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={stripRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="af-years flex max-w-full gap-2 overflow-x-auto px-1 py-1.5 sm:justify-center"
    >
      {years.map((year) => {
        const isSelected = year === selected;
        return (
          <button
            key={year}
            type="button"
            role="radio"
            id={`${idPrefix}-year-${year}`}
            data-year={year}
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(year)}
            className={clsx(
              "shrink-0 border px-3 py-1.5 font-pixel text-xs tracking-wide transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold",
              isSelected
                ? "border-amber-400/70 bg-amber-900/40 text-amber-200 shadow-[0_0_14px_rgba(240,164,58,0.25)]"
                : "border-amber-900/50 bg-black/40 text-slate-400 hover:border-amber-700/70 hover:text-amber-300"
            )}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
};
