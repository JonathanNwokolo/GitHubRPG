import React, { useMemo } from "react";
import { clsx } from "clsx";
import { Badge, RpgIconFrame } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import {
  describeInterlude,
  describeYear,
  type InterludeView,
  type YearView,
} from "./chronicleText";
import { CARD_BORDER, CHAPTER_ICON, FRAME_RARITY, HIGHLIGHT_ICON, HIGHLIGHT_TEXT } from "./chronicleIcons";
import { staggerStyle, TimelineRail } from "./TimelineRail";
import type { ChronicleInterlude, ChronicleYear, DeveloperChronicle } from "./types";

type EntryView =
  | { type: "year"; entry: ChronicleYear; view: YearView }
  | { type: "interlude"; entry: ChronicleInterlude; view: InterludeView };

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
      {/* The frame is `relative` itself, so the absolute positioning lives on a wrapper. */}
      <span aria-hidden="true" className="absolute left-0 top-0 z-10">
        <RpgIconFrame
          size="md"
          shape="hex"
          rarity={FRAME_RARITY[entry.rarity]}
          glow={entry.rarity !== "normal"}
          className={clsx(exceptional && "animate-glow")}
        >
          <Icon className="w-5 h-5" />
        </RpgIconFrame>
      </span>

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

/** Every chapter and interlude of the journey, chronologically. */
export const ChronicleTimelineFull: React.FC<{ chronicle: DeveloperChronicle }> = ({ chronicle }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).chronicle;

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
  );
};
