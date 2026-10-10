"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupportedLanguage } from "@/i18n";
import { fill } from "@/lib/format";
import { flameLevel } from "./buildActivityFlame";
import {
  flameDictionary,
  flameLevelName,
  formatFlameContributions,
  formatFlameDate,
} from "./flameText";
import type { FlameLevel, FlameYear } from "./types";

export type FlamePhase = "idle" | "igniting" | "settled";

const DAY_MS = 86_400_000;
const WEEKDAY_LABEL_ROWS = new Set([1, 3, 5]);
/** Half of the tooltip's max width: keeps it inside the heatmap's box. */
const TOOLTIP_HALF_WIDTH = 120;
/** Months closer than this many columns to the previous label are not labelled (they would overlap). */
const MIN_LABEL_GAP_COLUMNS = 3;

interface HeatmapGeometry {
  weeks: number;
  /** Day of week (0 = Sunday) of January 1st. */
  startDow: number;
  monthLabels: Array<{ column: number; month: number }>;
  lastIndex: number;
}

function isoOfIndex(year: number, index: number): string {
  return new Date(Date.UTC(year, 0, 1 + index)).toISOString().slice(0, 10);
}

function buildGeometry(year: FlameYear): HeatmapGeometry {
  const startDow = new Date(Date.UTC(year.year, 0, 1)).getUTCDay();
  const weeks = Math.max(1, Math.ceil((startDow + year.counts.length) / 7));
  const monthLabels: HeatmapGeometry["monthLabels"] = [];
  let previousColumn = -MIN_LABEL_GAP_COLUMNS;
  for (let month = 0; month < 12; month++) {
    const index = Math.floor((Date.UTC(year.year, month, 1) - Date.UTC(year.year, 0, 1)) / DAY_MS);
    if (index >= year.counts.length) break;
    if (index < year.firstDayIndex && month > 0) continue;
    const column = Math.floor((index + startDow) / 7);
    if (column - previousColumn < MIN_LABEL_GAP_COLUMNS || column > weeks - 2) continue;
    monthLabels.push({ column, month: month + 1 });
    previousColumn = column;
  }
  return { weeks, startDow, monthLabels, lastIndex: year.counts.length - 1 };
}

interface ActiveCell {
  index: number;
  left: number;
  top: number;
}

interface FlameHeatmapProps {
  year: FlameYear;
  cutoffs: readonly number[];
  language: SupportedLanguage;
  phase: FlamePhase;
}

function monthShort(month: number, language: SupportedLanguage): string {
  return new Date(Date.UTC(2001, month - 1, 1)).toLocaleDateString(language === "pt-BR" ? "pt-BR" : "en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

function weekdayShort(row: number, language: SupportedLanguage): string {
  // 2023-01-01 was a Sunday.
  return new Date(Date.UTC(2023, 0, 1 + row)).toLocaleDateString(language === "pt-BR" ? "pt-BR" : "en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/**
 * The year as a calendar of runes: columns are weeks (Sunday first), rows are weekdays, newest to the right.
 * An ARIA grid with ONE tab stop: arrows move between days (left/right = week, up/down = day), Home/End jump to the
 * first/last day. The tooltip (hover, focus or tap) says the same thing as each cell's accessible name.
 * Remount it per year (`key`) so its focus and tooltip state start fresh.
 */
export const FlameHeatmap: React.FC<FlameHeatmapProps> = ({ year, cutoffs, language, phase }) => {
  const t = flameDictionary(language);
  const geometry = useMemo(() => buildGeometry(year), [year]);
  const levels = useMemo(() => year.counts.map((count) => flameLevel(count, cutoffs)), [year, cutoffs]);

  const firstIndex = year.firstDayIndex;
  const [focusIndex, setFocusIndex] = useState(geometry.lastIndex);
  const [active, setActive] = useState<ActiveCell | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // The year in progress opens on its newest week; a finished year opens on January.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollLeft = year.inProgress ? scroller.scrollWidth : 0;
  }, [year.inProgress, year.year]);

  const show = useCallback((index: number, element: HTMLElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cell = element.getBoundingClientRect();
    const box = wrap.getBoundingClientRect();
    const raw = cell.left + cell.width / 2 - box.left;
    const left =
      box.width > TOOLTIP_HALF_WIDTH * 2 ? Math.min(Math.max(raw, TOOLTIP_HALF_WIDTH), box.width - TOOLTIP_HALF_WIDTH) : raw;
    setActive({ index, left, top: cell.top - box.top });
  }, []);

  const indexOf = (target: EventTarget | null): { index: number; element: HTMLElement } | null => {
    const element = (target as HTMLElement | null)?.closest<HTMLElement>("[data-day]") ?? null;
    if (!element) return null;
    return { index: Number(element.dataset.day), element };
  };

  const moveFocus = (next: number) => {
    const clamped = Math.min(geometry.lastIndex, Math.max(firstIndex, next));
    setFocusIndex(clamped);
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${clamped}"]`)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = indexOf(event.target)?.index;
    if (current === undefined) return;
    const steps: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    if (event.key in steps) {
      event.preventDefault();
      moveFocus(current + steps[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(firstIndex);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(geometry.lastIndex);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  const describe = (index: number): { date: string; contributions: string; level: FlameLevel; levelName: string } => {
    const level = levels[index];
    return {
      date: formatFlameDate(isoOfIndex(year.year, index), language),
      contributions: formatFlameContributions(year.counts[index], language),
      level,
      levelName: flameLevelName(level, language),
    };
  };

  const rows = Array.from({ length: 7 }, (_, row) => row);
  const columns = Array.from({ length: geometry.weeks }, (_, column) => column);
  const activeInfo = active ? describe(active.index) : null;

  return (
    <div ref={wrapRef} className="af-heat relative" data-phase={phase}>
      <div ref={scrollerRef} className="af-scroller" onScroll={() => setActive(null)}>
        <div className="af-canvas">
          <div className="af-months" aria-hidden="true">
            {geometry.monthLabels.map(({ column, month }) => (
              <span
                key={month}
                className="af-month font-sans"
                style={{ left: `calc(${column} * (var(--af-cell) + var(--af-gap)))` }}
              >
                {monthShort(month, language)}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label={fill(t.heatmap.label, { year: year.year })}
            className="flex flex-col"
            style={{ gap: "var(--af-gap)" }}
            onKeyDown={onKeyDown}
            onMouseOver={(event) => {
              const hit = indexOf(event.target);
              if (hit && hit.index >= firstIndex) show(hit.index, hit.element);
            }}
            onMouseLeave={() => setActive(null)}
            onFocus={(event) => {
              const hit = indexOf(event.target);
              if (hit) show(hit.index, hit.element);
            }}
            onBlur={() => setActive(null)}
            onClick={(event) => {
              const hit = indexOf(event.target);
              if (hit && hit.index >= firstIndex) {
                setFocusIndex(hit.index);
                show(hit.index, hit.element);
              }
            }}
          >
            {rows.map((row) => (
              <div key={row} role="row" className="af-row">
                <span aria-hidden="true" className="af-weekday font-sans">
                  {WEEKDAY_LABEL_ROWS.has(row) ? weekdayShort(row, language) : ""}
                </span>
                {columns.map((column) => {
                  const index = column * 7 + row - geometry.startDow;
                  if (index < 0 || index > geometry.lastIndex) {
                    return <span key={column} aria-hidden="true" className="af-slot" />;
                  }
                  const style = { "--af-col": column } as React.CSSProperties;
                  if (index < firstIndex) {
                    return (
                      <span
                        key={column}
                        aria-hidden="true"
                        title={t.heatmap.beforeJourney}
                        className="af-slot af-cell af-cell--before"
                      />
                    );
                  }
                  const info = describe(index);
                  return (
                    <div
                      key={column}
                      role="gridcell"
                      tabIndex={index === focusIndex ? 0 : -1}
                      data-day={index}
                      data-level={info.level}
                      data-active={active?.index === index ? "true" : undefined}
                      aria-label={fill(t.heatmap.cell, {
                        date: info.date,
                        contributions: info.contributions,
                        level: info.levelName,
                      })}
                      className="af-slot af-cell"
                      style={style}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {active && activeInfo && (
        <div
          aria-hidden="true"
          className="af-tooltip font-sans"
          style={{ left: active.left, top: active.top }}
        >
          <p className="text-xs font-semibold leading-snug text-amber-100">{activeInfo.date}</p>
          <p className="mt-1 font-pixel text-xs leading-snug text-amber-300">{activeInfo.contributions}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] italic leading-snug text-slate-300">
            <span
              aria-hidden="true"
              className="af-cell af-legend-cell"
              data-level={activeInfo.level}
              style={{ width: 9, height: 9 }}
            />
            {fill(t.heatmap.tooltipLevel, { level: activeInfo.levelName })}
          </p>
        </div>
      )}
    </div>
  );
};

/** Menos [runes] Mais: the same cells as the grid, so the scale is read without color alone. */
export const FlameLegend: React.FC<{ language: SupportedLanguage }> = ({ language }) => {
  const t = flameDictionary(language);
  const levels: FlameLevel[] = [0, 1, 2, 3, 4, 5];
  return (
    <div aria-hidden="true" className="af-heat flex items-center justify-end gap-1.5 font-sans text-[11px] text-slate-400">
      <span>{t.heatmap.less}</span>
      {levels.map((level) => (
        <span key={level} className="af-cell af-legend-cell" data-level={level} />
      ))}
      <span>{t.heatmap.more}</span>
    </div>
  );
};
