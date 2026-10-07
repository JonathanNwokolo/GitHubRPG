import React from "react";
import { clsx } from "clsx";
import "./profile-ui.css";

export type ProfileMeterTone = "gold" | "bright" | "hp" | "mp" | "emerald" | "arcane" | "azure";

interface ProfileMeterProps {
  value: number;
  max?: number;
  tone?: ProfileMeterTone;
  size?: "sm" | "md" | "lg";
  /** Accessible name of the bar (the visible label usually sits next to it). */
  "aria-label": string;
  className?: string;
}

/** The real bar of the profile: an inset metal rail with a glowing fill. Same ARIA contract as `ProgressBar`. */
export function ProfileMeter({ value, max = 100, tone = "gold", size = "md", className, ...rest }: ProfileMeterProps) {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={rest["aria-label"]}
      className={clsx("pf-meter", `pf-meter--${size}`, `pf-meter--${tone}`, className)}
    >
      <div className="pf-meter__fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}
