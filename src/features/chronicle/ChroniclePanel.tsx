"use client";

import React, { useMemo } from "react";
import { clsx } from "clsx";
import { Badge, Card, RpgIconFrame, RpgCalendar, RpgGitCommit, RpgMana, RpgShield, RpgCompass } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import {
  describeInterlude,
  describePresent,
  describeSummary,
  describeYear,
  type InterludeView,
  type SummaryItemView,
  type YearView,
} from "./chronicleText";
import { CARD_BORDER, CHAPTER_ICON, FRAME_RARITY, HIGHLIGHT_ICON, HIGHLIGHT_TEXT } from "./chronicleIcons";
import type { ChronicleInterlude, ChronicleYear, DeveloperChronicle } from "./types";

interface ChroniclePanelProps {
  chronicle: DeveloperChronicle;
}

type EntryView =
  | { type: "year"; entry: ChronicleYear; view: YearView }
  | { type: "interlude"; entry: ChronicleInterlude; view: InterludeView };

/** Entries beyond this share one animation delay, so a long journey never makes the reader wait. */
const MAX_STAGGER_STEPS = 8;
const STAGGER_MS = 60;

const SUMMARY_ICON: Record<SummaryItemView["id"], React.ReactNode> = {
  journeyLength: <RpgCalendar className="w-4 h-4 text-emerald-400" />,
  mostActiveYear: <RpgMana className="w-4 h-4 text-red-400" />,
  longestStreak: <RpgShield className="w-4 h-4 text-cyan-400" />,
  totalContributions: <RpgGitCommit className="w-4 h-4 text-amber-400" />,
};

const SUMMARY_RARITY = {
  journeyLength: "emerald",
  mostActiveYear: "crimson",
  longestStreak: "azure",
  totalContributions: "gold",
} as const;

function staggerStyle(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` };
}

/**
 * The vertical line of the timeline, drawn per entry so it stays continuous without measuring anything.
 * It runs from the first medallion to the last one and no further.
 */
const TimelineRail: React.FC<{ isFirst: boolean; isLast: boolean }> = ({ isFirst, isLast }) => (
  <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-9 flex justify-center pointer-events-none">
    <span
      className={clsx(
        "w-px bg-gradient-to-b from-rpg-goldDark/70 to-rpg-borderLight",
        isFirst ? "mt-4" : "mt-0",
        isLast ? "h-4" : "h-full"
      )}
    />
  </span>
);

const YearEntry: React.FC<{
  entry: ChronicleYear;
  view: YearView;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  currentTag: string;
}> = ({ entry, view, index, isFirst, isLast, currentTag }) => {
  const Icon = CHAPTER_ICON[entry.chapter];
  const exceptional = entry.rarity === "exceptional";

  return (
    <li className="relative pl-14 sm:pl-16 pb-6 animate-fade-rise" style={staggerStyle(index)}>
      <TimelineRail isFirst={isFirst} isLast={isLast} />
      <RpgIconFrame
        size="md"
        shape="hex"
        rarity={FRAME_RARITY[entry.rarity]}
        glow={entry.rarity !== "normal"}
        className={clsx("absolute left-0 top-0 z-10", exceptional && "animate-glow")}
        aria-hidden="true"
      >
        <Icon className="w-5 h-5" />
      </RpgIconFrame>

      <article className={clsx("min-w-0 p-4 sm:p-5 space-y-3 bg-rpg-obsidian border-2", CARD_BORDER[entry.rarity])}>
        <header className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-pixel text-base sm:text-lg text-rpg-gold">{view.year}</span>
            {entry.isCurrent && entry.chapter !== "currentChapter" && (
              <Badge variant="emerald" size="sm">
                {currentTag}
              </Badge>
            )}
          </div>
          <h3 className="font-sans font-extrabold text-base sm:text-lg uppercase tracking-wide text-slate-100 leading-snug">
            {view.title}
          </h3>
        </header>

        {view.description && <p className="font-sans text-sm text-slate-300 leading-relaxed">{view.description}</p>}
        {view.unknownNote && <p className="font-sans text-xs text-slate-400">{view.unknownNote}</p>}

        {view.metrics.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {view.metrics.map((metric) => (
              <li
                key={metric.key}
                className="inline-flex items-baseline gap-1.5 px-2.5 py-1 bg-rpg-surface border border-rpg-border"
              >
                <span className="font-mono text-sm font-bold text-amber-400">{metric.value}</span>{" "}
                <span className="font-sans text-xs text-slate-300">{metric.label}</span>
              </li>
            ))}
          </ul>
        )}

        {view.highlights.length > 0 && (
          <ul className="space-y-2.5 border-t border-rpg-border/60 pt-3">
            {view.highlights.map((highlight) => {
              const HighlightIcon = HIGHLIGHT_ICON[highlight.kind];
              return (
                <li key={highlight.kind} className="flex items-start gap-2.5">
                  <RpgIconFrame size="sm" shape="circle" rarity={FRAME_RARITY[highlight.rarity]} className="mt-0.5" aria-hidden="true">
                    <HighlightIcon className="w-4 h-4" />
                  </RpgIconFrame>
                  <div className="min-w-0">
                    <p className={clsx("font-sans text-xs font-bold uppercase tracking-wider", HIGHLIGHT_TEXT[highlight.rarity])}>
                      {highlight.label}
                    </p>
                    <p className="font-sans text-xs text-slate-300 leading-relaxed">{highlight.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </li>
  );
};

const InterludeEntry: React.FC<{
  range: string;
  text: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ range, text, index, isFirst, isLast }) => (
  <li className="relative pl-14 sm:pl-16 pb-6 animate-fade-rise" style={staggerStyle(index)}>
    <TimelineRail isFirst={isFirst} isLast={isLast} />
    <span aria-hidden="true" className="absolute left-4 top-1.5 w-2 h-2 rotate-45 bg-rpg-borderLight border border-rpg-border z-10" />
    <p className="font-sans text-xs sm:text-sm text-slate-400 leading-relaxed">
      <span className="font-mono font-bold text-slate-300">{range}</span>
      <span aria-hidden="true"> · </span>
      {text}
    </p>
  </li>
);

export const ChroniclePanel: React.FC<ChroniclePanelProps> = ({ chronicle }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).chronicle;

  const summary = useMemo(() => describeSummary(chronicle, language), [chronicle, language]);
  const present = useMemo(() => describePresent(chronicle, language), [chronicle, language]);
  const entries = useMemo<EntryView[]>(
    () =>
      chronicle.timeline.map((entry) =>
        entry.type === "year"
          ? { type: "year", entry, view: describeYear(entry, chronicle, language) }
          : { type: "interlude", entry, view: describeInterlude(entry, language) }
      ),
    [chronicle, language]
  );

  return (
    <section className="space-y-6" aria-labelledby="chronicle-title">
      <div className="border-b border-rpg-border pb-4">
        <h2 id="chronicle-title" className="font-pixel text-sm sm:text-base text-rpg-gold uppercase tracking-wider">
          {t.title}
        </h2>
        <p className="font-sans text-xs sm:text-sm text-rpg-parchmentMuted mt-2 max-w-3xl leading-relaxed">{t.subtitle}</p>
      </div>

      {chronicle.coverage !== "full" && (
        <p
          role="note"
          className={clsx(
            "font-sans text-xs sm:text-sm leading-relaxed p-3 border",
            chronicle.coverage === "partial"
              ? "border-amber-700/60 bg-amber-950/30 text-amber-200"
              : "border-rpg-border bg-rpg-surface text-slate-300"
          )}
        >
          {chronicle.coverage === "partial" ? t.coverage.partial : t.coverage.unavailable}
        </p>
      )}

      <Card className="space-y-4 p-5 sm:p-6">
        <h3 className="font-pixel text-xs sm:text-sm text-rpg-gold uppercase tracking-wider">{t.summaryTitle}</h3>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {summary.map((item) => (
            <li
              key={item.id}
              className="p-3.5 bg-rpg-surface border border-rpg-border flex flex-col items-center text-center gap-1.5"
            >
              <RpgIconFrame size="md" shape="slate" rarity={SUMMARY_RARITY[item.id]} glow>
                {SUMMARY_ICON[item.id]}
              </RpgIconFrame>
              <p className="font-mono text-base sm:text-lg font-bold text-amber-400 max-w-full break-words">{item.value}</p>
              <p className="font-sans text-xs text-slate-300 font-medium leading-tight">{item.label}</p>
            </li>
          ))}
        </ul>
      </Card>

      <ol aria-label={t.timelineLabel} className="relative">
        {entries.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === entries.length - 1;
          return item.type === "year" ? (
            <YearEntry
              key={`year-${item.entry.year}`}
              entry={item.entry}
              view={item.view}
              index={index}
              isFirst={isFirst}
              isLast={isLast}
              currentTag={t.currentTag}
            />
          ) : (
            <InterludeEntry
              key={`interlude-${item.entry.fromYear}`}
              range={item.view.range}
              text={item.view.text}
              index={index}
              isFirst={isFirst}
              isLast={isLast}
            />
          );
        })}
      </ol>

      {present.length > 0 && (
        <Card className="p-5 sm:p-6 flex items-start gap-3.5">
          <RpgIconFrame size="md" shape="circle" rarity="arcane" glow aria-hidden="true">
            <RpgCompass className="w-5 h-5" />
          </RpgIconFrame>
          <div className="min-w-0 space-y-1.5">
            <h3 className="font-pixel text-xs sm:text-sm text-rpg-gold uppercase tracking-wider">{t.present.title}</h3>
            <p className="font-sans text-xs text-slate-400">{t.present.note}</p>
            {present.map((line) => (
              <p key={line} className="font-sans text-sm text-slate-200 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
};
