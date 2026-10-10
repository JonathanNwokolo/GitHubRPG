"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { RpgClock, RpgFlame, RpgIconFrame } from "@/design-system";
import { ProfileDivider, ProfileSectionHeader, ProfileSummaryTile } from "@/features/profile-ui";
import { fill, formatNumber, pluralize } from "@/lib/format";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { FlameHeatmap, FlameLegend, type FlamePhase } from "./FlameHeatmap";
import { FlameYearPicker } from "./FlameYearPicker";
import {
  describeFlameInsight,
  describeFlameRange,
  formatFlameDate,
  formatFlameDays,
  formatFlameMonth,
} from "./flameText";
import type { ActivityFlameModel, FlameYear } from "./types";
import "./activity-flame.css";

/** The whole column-by-column ignition (last column delay + animation) with a small margin. */
const IGNITION_MS = 1200;

interface ActivityFlameSectionProps {
  model: ActivityFlameModel;
}

/**
 * Starts the ignition once the section is actually seen. Without IntersectionObserver, or when the visitor asked to
 * reduce motion, the runes are simply lit (no animation, nothing hidden).
 */
function useIgnition(): { ref: React.RefObject<HTMLDivElement | null>; phase: FlamePhase } {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<FlamePhase>("idle");

  useEffect(() => {
    const node = ref.current;
    const reduceMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || reduceMotion || typeof IntersectionObserver === "undefined") {
      setPhase("settled");
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setPhase("igniting");
        timer = setTimeout(() => setPhase("settled"), IGNITION_MS);
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { ref, phase };
}

/**
 * "Chama da Atividade": the contribution calendar told as the hero's vital energy. Everything it shows comes from the
 * ActivityFlameModel (built from the calendar GitHub already returned: no request, nothing recomputed per render).
 */
export const ActivityFlameSection: React.FC<ActivityFlameSectionProps> = ({ model }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).activityFlame;
  const idPrefix = useId().replace(/:/g, "");
  const { ref, phase } = useIgnition();

  const years = useMemo(() => model.years.map((entry) => entry.year), [model.years]);
  const [selected, setSelected] = useState<number | null>(model.defaultYear);
  const [switched, setSwitched] = useState(false);

  const current: FlameYear | undefined =
    model.years.find((entry) => entry.year === selected) ?? model.years[model.years.length - 1];

  const header = <ProfileSectionHeader id="activity-flame-title" title={t.title} subtitle={t.subtitle} />;

  // No calendar at all, or one in which nothing was ever lit: an empty state, never an error and never a made-up number.
  if (!current || model.totalContributions === 0) {
    const dormant = model.years.length > 0;
    return (
      <section id="activity-flame" aria-labelledby="activity-flame-title" className="space-y-8">
        {header}
        <div className="af-panel mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-8 text-center" role="status">
          <RpgIconFrame size="lg" shape="circle" rarity="arcane" glow aria-hidden="true">
            <RpgFlame className="h-7 w-7 text-amber-300" />
          </RpgIconFrame>
          <p className="font-pixel text-xs leading-relaxed text-amber-200 sm:text-sm">
            {dormant ? t.empty.dormantTitle : t.empty.title}
          </p>
          <p className="font-sans text-sm leading-relaxed text-slate-300">
            {dormant ? t.empty.dormantMessage : t.empty.message}
          </p>
        </div>
      </section>
    );
  }

  const onSelect = (year: number) => {
    setSwitched(true);
    setSelected(year);
  };

  const { stats, records, insight } = current;
  const streakTile = current.inProgress
    ? { label: t.stats.currentStreak, value: formatFlameDays(stats.endStreak.days, stats.endStreak.exact, language) }
    : { label: t.stats.endStreak, value: formatFlameDays(stats.endStreak.days, stats.endStreak.exact, language) };
  const tiles = [
    {
      label: t.stats.longestStreak,
      value: stats.longestStreak
        ? formatFlameDays(stats.longestStreak.days, stats.longestStreak.exact, language)
        : formatFlameDays(0, true, language),
      partial: stats.longestStreak ? !stats.longestStreak.exact : false,
    },
    { ...streakTile, partial: !stats.endStreak.exact },
    { label: t.stats.activeDays, value: String(stats.activeDays), partial: false },
    { label: t.stats.contributions, value: formatNumber(stats.contributions, language), partial: false },
  ];

  const countParts = (count: number) => ({ value: formatNumber(count, language), unit: pluralize(count, t.units.contribution) });
  const dayParts = (days: number, exact: boolean) => ({
    value: `${exact ? "" : "≥ "}${formatNumber(days, language)}`,
    unit: pluralize(days, t.units.day),
  });
  const recordRows: Array<{ id: string; label: string; value: string; unit: string | null; detail: string | null }> = [
    {
      id: "longestStreak",
      label: t.records.longestStreak,
      ...(records.longestStreak
        ? dayParts(records.longestStreak.days, records.longestStreak.exact)
        : { value: t.records.none, unit: null }),
      detail: records.longestStreak ? describeFlameRange(records.longestStreak, language) : null,
    },
    {
      id: "bestDay",
      label: t.records.bestDay,
      ...(records.bestDay ? countParts(records.bestDay.count) : { value: t.records.none, unit: null }),
      detail: records.bestDay ? formatFlameDate(records.bestDay.date, language) : null,
    },
    {
      id: "bestWeek",
      label: t.records.bestWeek,
      ...(records.bestWeek ? countParts(records.bestWeek.count) : { value: t.records.none, unit: null }),
      detail: records.bestWeek ? describeFlameRange(records.bestWeek, language) : null,
    },
    {
      id: "bestMonth",
      label: t.records.bestMonth,
      ...(records.bestMonth ? countParts(records.bestMonth.count) : { value: t.records.none, unit: null }),
      detail: records.bestMonth ? formatFlameMonth(records.bestMonth.month, language) : null,
    },
  ];

  return (
    <section id="activity-flame" aria-labelledby="activity-flame-title" className="space-y-8">
      {header}

      {model.coverage === "partial" && (
        <p
          role="note"
          className="mx-auto max-w-3xl border border-amber-700/60 bg-amber-950/30 p-3 font-sans text-xs leading-relaxed text-amber-200 sm:text-sm"
        >
          {t.coverage.partial}
        </p>
      )}

      <div ref={ref} className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-2 font-sans text-xs font-semibold uppercase tracking-wide text-slate-400">
            <RpgClock className="h-4 w-4 text-amber-400" aria-hidden="true" />
            {t.timeTravel}
          </p>
          <FlameYearPicker years={years} selected={current.year} onSelect={onSelect} label={t.yearsLabel} idPrefix={idPrefix} />
        </div>

        <div
          key={current.year}
          role="group"
          aria-label={fill(t.yearPanel, { year: current.year })}
          className={switched ? "af-swap space-y-6" : "space-y-6"}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <h3 className="pf-section-title text-xs sm:text-sm">{fill(t.stats.groupLabel, { year: current.year })}</h3>
            {current.inProgress && (
              <span className="border border-amber-700/50 bg-amber-950/30 px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                {t.yearInProgress}
              </span>
            )}
          </div>

          <ul
            aria-label={fill(t.stats.groupLabel, { year: current.year })}
            className="pf-tiles mx-auto grid max-w-sm grid-cols-2 gap-3 sm:max-w-none sm:gap-4 lg:grid-cols-4"
          >
            {tiles.map((tile) => (
              <ProfileSummaryTile
                key={tile.label}
                value={tile.value}
                label={tile.label}
                hint={tile.partial ? t.coverage.partial : undefined}
              />
            ))}
          </ul>

          <div className="af-panel space-y-3 p-3 sm:p-5">
            <FlameHeatmap year={current} cutoffs={model.cutoffs} language={language} phase={phase} />
            <FlameLegend language={language} />
            <p className="sr-only">{t.heatmap.hint}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section aria-labelledby={`${idPrefix}-oracle`} className="af-panel flex items-center gap-3 p-4 sm:p-5">
              <RpgIconFrame size="sm" shape="circle" rarity="arcane" glow aria-hidden="true">
                <RpgFlame className="h-4 w-4" />
              </RpgIconFrame>
              <div className="min-w-0 space-y-2">
                <h4 id={`${idPrefix}-oracle`} className="pf-section-title text-xs">
                  {t.oracle.title}
                </h4>
                <p aria-live="polite" className="font-sans text-sm leading-relaxed text-slate-100">
                  {describeFlameInsight(insight, language)}
                </p>
              </div>
            </section>

            <section aria-labelledby={`${idPrefix}-records`} className="af-panel space-y-3 p-4 sm:p-5">
              <h4 id={`${idPrefix}-records`} className="pf-section-title text-xs">
                {t.records.title}
              </h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                {recordRows.map((row) => (
                  <div key={row.id} className="min-w-0 border-l-2 border-amber-900/60 pl-3">
                    <dt className="font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.label}</dt>
                    <dd className="break-words leading-snug">
                      <span className="font-pixel text-sm text-amber-200">{row.value}</span>
                      {row.unit && (
                        <>
                          {" "}
                          <span className="font-sans text-xs text-slate-300">{row.unit}</span>
                        </>
                      )}
                    </dd>
                    {row.detail && <dd className="font-sans text-xs leading-snug text-slate-400">{row.detail}</dd>}
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>

        <ProfileDivider maxWidth={560} />
      </div>
    </section>
  );
};
