import React from "react";
import { ProfileMeter, type ProfileMeterTone } from "./ProfileMeter";
import "./profile-ui.css";

interface ProfileAttributeRailProps {
  label: React.ReactNode;
  /** Plain text of the label, for the bar's accessible name. */
  name: string;
  value: number;
  max?: number;
  tone?: ProfileMeterTone;
  /** Shown after the number, e.g. "/ 100". */
  valueSuffix?: string;
}

/** One attribute as a status plate: the metal rail is the chassis, the meter and the number are real HTML. */
export function ProfileAttributeRail({ label, name, value, max = 100, tone = "gold", valueSuffix }: ProfileAttributeRailProps) {
  return (
    <div className="pf-rail">
      <div className="pf-rail__label font-sans text-sm font-bold text-amber-50">{label}</div>
      <div className="pf-rail__meter">
        <ProfileMeter value={value} max={max} tone={tone} size="md" aria-label={name} />
      </div>
      <div className="pf-rail__value whitespace-nowrap font-pixel text-xs text-amber-100">
        {value}
        {valueSuffix && <span className="pf-muted font-sans text-[11px] font-semibold"> {valueSuffix}</span>}
      </div>
    </div>
  );
}
