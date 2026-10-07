"use client";

import React from "react";
import { ProgressBar, type ProgressBarVariant } from "@/design-system";
import { ProfileMeter } from "@/features/profile-ui";
import type { ThresholdProgress } from "@/game/types";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { describeProgress } from "./progressView";

interface ProgressDetailProps {
  progress: ThresholdProgress;
  /** Hides the secondary notes (used in dense cards). */
  compact?: boolean;
  /** "profile": the metal meter of the character sheet. */
  tone?: "default" | "profile";
  className?: string;
}

/**
 * Shows "have / goal / remaining" for any engine goal.
 * What is shown (exact, "at least", unavailable) comes from the engine's coverage rules.
 */
export const ProgressDetail: React.FC<ProgressDetailProps> = ({ progress, compact = false, tone = "default", className }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const view = describeProgress(progress, t, language);

  const barVariant: ProgressBarVariant = view.state === "unlocked" ? "xp" : "stat";

  return (
    <div className={`space-y-1.5 ${className ?? ""}`} data-progress-state={view.state}>
      <p className="font-mono text-xs font-bold text-amber-400">{view.headline}</p>
      {view.barPercent !== null &&
        (tone === "profile" ? (
          <ProfileMeter
            value={view.barPercent}
            max={100}
            tone={view.state === "unlocked" ? "bright" : "gold"}
            size="sm"
            aria-label={view.headline}
          />
        ) : (
          <ProgressBar
            value={view.barPercent}
            max={100}
            variant={barVariant}
            showValueText={false}
            size="sm"
            aria-label={view.headline}
          />
        ))}
      {view.detail && <p className="font-sans text-xs text-slate-300">{view.detail}</p>}
      {!compact && view.note && <p className="font-sans text-xs text-slate-400 italic">{view.note}</p>}
    </div>
  );
};
