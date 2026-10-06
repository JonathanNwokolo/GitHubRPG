"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Button, Card, RpgCompass, RpgIconFrame, RpgTome } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { describePresent, describeSummary } from "./chronicleText";
import { ChronicleSummary } from "./ChronicleSummary";
import { ChronicleTimelineFull } from "./ChronicleTimelineFull";
import { ChronicleTimelinePreview } from "./ChronicleTimelinePreview";
import type { DeveloperChronicle } from "./types";

interface ChronicleSectionProps {
  chronicle: DeveloperChronicle;
}

/**
 * The Chronicle as a section of the character sheet: summary strip, a three-chapter preview and an inline
 * expansion to the whole timeline. Everything it shows comes from the DeveloperChronicle (nothing is recomputed here).
 */
export const ChronicleSection: React.FC<ChronicleSectionProps> = ({ chronicle }) => {
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
    <Card id="chronicle" className="space-y-4 p-5 sm:p-6" aria-labelledby="chronicle-title" role="region">
      <div className="border-b border-rpg-border pb-3">
        <h2 id="chronicle-title" className="font-pixel text-xs sm:text-sm text-rpg-gold uppercase tracking-wider flex items-center gap-2">
          <RpgIconFrame size="xs" shape="slate" rarity="azure" glow aria-hidden="true">
            <RpgTome className="w-3.5 h-3.5" />
          </RpgIconFrame>
          <span>{t.title}</span>
        </h2>
        <p className="font-sans text-xs text-slate-400 mt-1">{t.subtitle}</p>
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

      <ChronicleSummary items={summary} label={t.summaryTitle} />

      <div id={regionId} className="pt-1">
        {expanded ? <ChronicleTimelineFull chronicle={chronicle} /> : <ChronicleTimelinePreview chronicle={chronicle} />}
      </div>

      {expanded && present.length > 0 && (
        <div className="flex items-start gap-3 border-t border-rpg-border/70 pt-4">
          <RpgIconFrame size="sm" shape="circle" rarity="arcane" glow aria-hidden="true">
            <RpgCompass className="w-4 h-4" />
          </RpgIconFrame>
          <div className="min-w-0 space-y-1">
            <h3 className="font-pixel text-xs text-rpg-gold uppercase tracking-wider">{t.present.title}</h3>
            <p className="font-sans text-xs text-slate-400">{t.present.note}</p>
            {present.map((line) => (
              <p key={line} className="font-sans text-sm text-slate-200 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      <Button
        ref={toggleRef}
        type="button"
        variant="secondary"
        size="sm"
        className="w-full sm:w-auto"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={toggle}
      >
        {expanded ? t.collapse : t.viewFull}
      </Button>
    </Card>
  );
};
