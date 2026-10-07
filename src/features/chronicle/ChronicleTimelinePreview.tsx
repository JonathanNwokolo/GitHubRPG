import React, { useMemo } from "react";
import { ProfileTimelineItem } from "@/features/profile-ui";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { describeYear } from "./chronicleText";
import { selectPreviewYears } from "./chroniclePreview";
import { timelineKind } from "./ChronicleTimelineFull";
import { ShareChapterButton, type ChapterShareRequest } from "./ShareChapterButton";
import { isShareableChapter } from "./shareableChapters";
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
    <ol aria-label={t.timelineLabel}>
      {events.map(({ entry, view }, index) => (
        <ProfileTimelineItem
          key={entry.year}
          kind={timelineKind(entry)}
          index={index}
          isFirst={index === 0}
          isLast={index === events.length - 1}
          year={<span className="font-pixel text-xs text-amber-300 sm:text-sm">{view.year}</span>}
        >
          <div className="min-w-0 space-y-1 pt-1.5">
            <h3 className="font-sans text-sm font-extrabold uppercase leading-snug tracking-wide text-amber-50 sm:text-base">
              {view.title}
            </h3>
            {view.description && (
              <p className="font-sans text-xs leading-relaxed text-slate-300 sm:text-sm">{view.description}</p>
            )}
            {onShareChapter && isShareableChapter(entry) && (
              <ShareChapterButton
                year={view.year}
                title={view.title}
                onShare={() => onShareChapter({ year: view.year, title: view.title })}
              />
            )}
          </div>
        </ProfileTimelineItem>
      ))}
    </ol>
  );
};
