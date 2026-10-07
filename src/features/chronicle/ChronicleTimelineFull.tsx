import React, { useMemo } from "react";
import { clsx } from "clsx";
import { Badge, RpgIconFrame } from "@/design-system";
import { ProfileTimelineItem, type ProfileTimelineKind } from "@/features/profile-ui";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import {
  describeInterlude,
  describeYear,
  type InterludeView,
  type YearView,
} from "./chronicleText";
import { FRAME_RARITY, HIGHLIGHT_ICON, HIGHLIGHT_TEXT } from "./chronicleIcons";
import { ShareChapterButton, type ChapterShareRequest } from "./ShareChapterButton";
import { isShareableChapter } from "./shareableChapters";
import type { ChronicleInterlude, ChronicleYear, DeveloperChronicle } from "./types";

type EntryView =
  | { type: "year"; entry: ChronicleYear; view: YearView }
  | { type: "interlude"; entry: ChronicleInterlude; view: InterludeView };

/** Which kit marker a chapter gets. It only reads what the Chronicle already decided (current, rarity). */
export function timelineKind(entry: Pick<ChronicleYear, "isCurrent" | "rarity">): ProfileTimelineKind {
  if (entry.isCurrent) return "current";
  return entry.rarity === "normal" ? "common" : "important";
}

const YearEntry: React.FC<{
  entry: ChronicleYear;
  view: YearView;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  currentTag: string;
  onShare?: () => void;
}> = ({ entry, view, index, isFirst, isLast, currentTag, onShare }) => (
  <ProfileTimelineItem
    kind={timelineKind(entry)}
    index={index}
    isFirst={isFirst}
    isLast={isLast}
    year={<span className="font-pixel text-xs text-amber-300 sm:text-sm">{view.year}</span>}
  >
    <article className="pf-tl__card space-y-3">
      <header className="space-y-1.5">
        {entry.isCurrent && entry.chapter !== "currentChapter" && (
          <Badge variant="emerald" size="sm">
            {currentTag}
          </Badge>
        )}
        <h3 className="font-sans text-base font-extrabold uppercase leading-snug tracking-wide text-amber-50 sm:text-lg">
          {view.title}
        </h3>
      </header>

      {view.description && <p className="font-sans text-sm leading-relaxed text-slate-300">{view.description}</p>}
      {view.unknownNote && <p className="pf-muted font-sans text-xs">{view.unknownNote}</p>}

      {view.metrics.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {view.metrics.map((metric) => (
            <li key={metric.key} className="pf-chip inline-flex items-baseline gap-1.5 px-2.5 py-1">
              <span className="font-mono text-sm font-bold text-amber-400">{metric.value}</span>{" "}
              <span className="font-sans text-xs text-slate-300">{metric.label}</span>
            </li>
          ))}
        </ul>
      )}

      {onShare && isShareableChapter(entry) && <ShareChapterButton year={view.year} title={view.title} onShare={onShare} />}

      {view.highlights.length > 0 && (
        <ul className="space-y-2.5 border-t border-amber-900/40 pt-3">
          {view.highlights.map((highlight) => {
            const HighlightIcon = HIGHLIGHT_ICON[highlight.kind];
            return (
              <li key={highlight.kind} className="flex items-start gap-2.5">
                <RpgIconFrame size="sm" shape="circle" rarity={FRAME_RARITY[highlight.rarity]} className="mt-0.5" aria-hidden="true">
                  <HighlightIcon className="h-4 w-4" />
                </RpgIconFrame>
                <div className="min-w-0">
                  <p className={clsx("font-sans text-xs font-bold uppercase tracking-wider", HIGHLIGHT_TEXT[highlight.rarity])}>
                    {highlight.label}
                  </p>
                  <p className="font-sans text-xs leading-relaxed text-slate-300">{highlight.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  </ProfileTimelineItem>
);

const InterludeEntry: React.FC<{
  range: string;
  text: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ range, text, index, isFirst, isLast }) => (
  <ProfileTimelineItem
    kind="common"
    index={index}
    isFirst={isFirst}
    isLast={isLast}
    year={<span className="font-mono text-[11px] font-bold text-slate-300 sm:text-xs">{range}</span>}
  >
    <p className="pf-muted pt-2 font-sans text-xs leading-relaxed sm:text-sm">{text}</p>
  </ProfileTimelineItem>
);

/** Every chapter and interlude of the journey, chronologically. */
export const ChronicleTimelineFull: React.FC<{
  chronicle: DeveloperChronicle;
  onShareChapter?: (chapter: ChapterShareRequest) => void;
}> = ({ chronicle, onShareChapter }) => {
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
    <ol aria-label={t.timelineLabel}>
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
            onShare={onShareChapter && (() => onShareChapter({ year: item.view.year, title: item.view.title }))}
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
