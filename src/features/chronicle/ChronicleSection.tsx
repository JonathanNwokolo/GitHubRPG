"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { RpgCompass, RpgIconFrame } from "@/design-system";
import { ProfileActionButton, ProfileDivider, ProfileSectionHeader } from "@/features/profile-ui";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { describePresent, describeSummary } from "./chronicleText";
import { ChronicleSummary } from "./ChronicleSummary";
import { ChronicleTimelineFull } from "./ChronicleTimelineFull";
import { ChronicleTimelinePreview } from "./ChronicleTimelinePreview";
import type { ChapterShareRequest } from "./ShareChapterButton";
import type { DeveloperChronicle } from "./types";

interface ChronicleSectionProps {
  chronicle: DeveloperChronicle;
  /** Opens the share card of a chapter. Without it, no chapter offers a share action. */
  onShareChapter?: (chapter: ChapterShareRequest) => void;
}

/**
 * The Chronicle as a section of the character sheet: summary strip, a three-chapter preview and an inline
 * expansion to the whole timeline. Everything it shows comes from the DeveloperChronicle (nothing is recomputed here).
 */
export const ChronicleSection: React.FC<ChronicleSectionProps> = ({ chronicle, onShareChapter }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).chronicle;
  const regionId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => describeSummary(chronicle, language), [chronicle, language]);
  const present = useMemo(() => describePresent(chronicle, language), [chronicle, language]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    // Collapsing shrinks the page under the reader: keep the button in view instead of jumping past it.
    if (!next) requestAnimationFrame(() => toggleRef.current?.scrollIntoView?.({ block: "nearest" }));
  };

  return (
    <section id="chronicle" aria-labelledby="chronicle-title" className="space-y-8">
      <ProfileSectionHeader id="chronicle-title" title={t.title} subtitle={t.subtitle} />

      {chronicle.coverage !== "full" && (
        <p
          role="note"
          className={clsx(
            "mx-auto max-w-3xl border p-3 font-sans text-xs leading-relaxed sm:text-sm",
            chronicle.coverage === "partial"
              ? "border-amber-700/60 bg-amber-950/30 text-amber-200"
              : "border-amber-900/40 bg-black/30 text-slate-300"
          )}
        >
          {chronicle.coverage === "partial" ? t.coverage.partial : t.coverage.unavailable}
        </p>
      )}

      <div className="mx-auto max-w-4xl space-y-5">
        <ChronicleSummary items={summary} label={t.summaryTitle} />
        <ProfileDivider maxWidth={560} />
      </div>

      <div id={regionId} className={clsx("mx-auto", expanded ? "max-w-4xl" : "max-w-2xl")}>
        {expanded ? (
          <ChronicleTimelineFull chronicle={chronicle} onShareChapter={onShareChapter} />
        ) : (
          <ChronicleTimelinePreview chronicle={chronicle} onShareChapter={onShareChapter} />
        )}
      </div>

      {expanded && present.length > 0 && (
        <div className="mx-auto flex max-w-4xl items-start gap-3 border-t border-amber-900/40 pt-4">
          <RpgIconFrame size="sm" shape="circle" rarity="arcane" glow aria-hidden="true">
            <RpgCompass className="h-4 w-4" />
          </RpgIconFrame>
          <div className="min-w-0 space-y-1">
            <h3 className="pf-section-title text-xs">{t.present.title}</h3>
            <p className="pf-muted font-sans text-xs">{t.present.note}</p>
            {present.map((line) => (
              <p key={line} className="font-sans text-sm leading-relaxed text-slate-200">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <ProfileActionButton
          ref={toggleRef}
          variant="secondary"
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={toggle}
        >
          {expanded ? t.collapse : t.viewFull}
        </ProfileActionButton>
      </div>
    </section>
  );
};
