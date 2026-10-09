"use client";

import React from "react";
import type { RPGStats } from "@/game/types";
import type { CharacterCalculationCoverage } from "@/game/coverage";
import {
  Tooltip,
  RpgZap,
  RpgTome,
  RpgStar,
  RpgLayers,
  RpgCalendar,
} from "@/design-system";
import { ProfileAttributeRail, ProfileSectionHeader, type ProfileMeterTone } from "@/features/profile-ui";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface AttributesPanelProps {
  stats: RPGStats;
  coverage: CharacterCalculationCoverage["attributes"];
}

export const AttributesPanel: React.FC<AttributesPanelProps> = ({ stats, coverage }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  // Each attribute keeps its own hue (as before); the rail around it is always the same gold metal.
  const statItems: Array<{
    key: keyof RPGStats;
    label: string;
    desc: string;
    icon: React.ReactNode;
    tone: ProfileMeterTone;
  }> = [
    {
      key: "activity",
      label: t.attributes.activity,
      desc: t.attributes.activityDesc,
      icon: <RpgZap className="h-4 w-4 text-emerald-300" />,
      tone: "emerald",
    },
    {
      key: "experience",
      label: t.attributes.experience,
      desc: t.attributes.experienceDesc,
      icon: <RpgTome className="h-4 w-4 text-purple-300" />,
      tone: "arcane",
    },
    {
      key: "reputation",
      label: t.attributes.reputation,
      desc: t.attributes.reputationDesc,
      icon: <RpgStar className="h-4 w-4 text-amber-300" />,
      tone: "bright",
    },
    {
      key: "versatility",
      label: t.attributes.versatility,
      desc: t.attributes.versatilityDesc,
      icon: <RpgLayers className="h-4 w-4 text-cyan-300" />,
      tone: "azure",
    },
    {
      key: "consistency",
      label: t.attributes.consistency,
      desc: t.attributes.consistencyDesc,
      icon: <RpgCalendar className="h-4 w-4 text-red-300" />,
      tone: "hp",
    },
  ];

  return (
    <section aria-labelledby="attributes-title" className="space-y-8">
      <ProfileSectionHeader id="attributes-title" title={t.character.attributesTitle} subtitle={t.character.scale} />

      <div className="mx-auto max-w-4xl space-y-2 px-2 sm:space-y-3.5 sm:px-4">
        {statItems.map((stat) => coverage[stat.key] === "complete" ? (
          <ProfileAttributeRail
            key={stat.key}
            name={stat.label}
            value={stats[stat.key]}
            valueSuffix="/ 100"
            tone={stat.tone}
            label={
              <Tooltip content={stat.desc} side="top">
                <span className="flex cursor-help items-center gap-2 transition-colors hover:text-amber-300">
                  {stat.icon}
                  <span>{stat.label}</span>
                </span>
              </Tooltip>
            }
          />
        ) : (
          <div key={stat.key} className="pf-rail" role="status" aria-label={`${stat.label}: ${t.attributes.unavailable}`}>
            <div className="pf-rail__label font-sans text-sm font-bold text-amber-50">
              <span className="flex items-center gap-2">{stat.icon}<span>{stat.label}</span></span>
            </div>
            <div className="pf-rail__meter h-2 rounded bg-slate-800/80" aria-hidden="true" />
            <div className="pf-rail__value font-sans text-xs font-semibold text-slate-400">{t.attributes.unavailable}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
