import React, { useMemo } from "react";
import { clsx } from "clsx";
import { RpgIconFrame } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { describeYear } from "./chronicleText";
import { CHAPTER_ICON, FRAME_RARITY } from "./chronicleIcons";
import { selectPreviewYears } from "./chroniclePreview";
import { ShareChapterButton, type ChapterShareRequest } from "./ShareChapterButton";
import { isShareableChapter } from "./shareableChapters";
import { staggerStyle, TimelineRail } from "./TimelineRail";
import type { DeveloperChronicle } from "./types";

/** The start, at most one relevant chapter in between, and the current chapter: year, title and sentence only. */
export const ChronicleTimelinePreview: React.FC<{
  chronicle: DeveloperChronicle;
  onShareChapter?: (chapter: ChapterShareRequest) => void;
}> = ({ chronicle, onShareChapter }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).chronicle;

  const events = useMemo(
    () =>
      selectPreviewYears(chronicle).map((entry) => ({
        entry,
        view: describeYear(entry, chronicle, language),
      })),
    [chronicle, language]
  );

  return (
    <ol aria-label={t.timelineLabel} className="relative">
      {events.map(({ entry, view }, index) => {
        const isFirst = index === 0;
        const isLast = index === events.length - 1;
        const Icon = CHAPTER_ICON[entry.chapter];
        return (
          <li
            key={entry.year}
            className={clsx("relative pl-11 animate-fade-rise", !isLast && "pb-4")}
            style={staggerStyle(index)}
          >
            <TimelineRail isFirst={isFirst} isLast={isLast} compact />
            {/* The frame is `relative` itself, so the absolute positioning lives on a wrapper. */}
            <span aria-hidden="true" className="absolute left-0 top-0 z-10">
              <RpgIconFrame size="sm" shape="hex" rarity={FRAME_RARITY[entry.rarity]} glow={entry.rarity !== "normal"}>
                <Icon className="w-4 h-4" />
              </RpgIconFrame>
            </span>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-pixel text-xs sm:text-sm text-rpg-gold">{view.year}</span>
                <h3 className="font-sans font-extrabold text-sm sm:text-base uppercase tracking-wide text-slate-100 leading-snug">
                  {view.title}
                </h3>
              </div>
              {view.description && (
                <p className="font-sans text-xs sm:text-sm text-slate-300 leading-relaxed">{view.description}</p>
              )}
              {onShareChapter && isShareableChapter(entry) && (
                <ShareChapterButton
                  year={view.year}
                  title={view.title}
                  onShare={() => onShareChapter({ year: view.year, title: view.title })}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
