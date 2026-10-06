"use client";

import React from "react";
import type { RPGStats } from "@/game/types";
import {
  Card,
  ProgressBar,
  Tooltip,
  PixelZap,
  PixelTome,
  PixelStar,
  PixelLayers,
  PixelCalendar,
  type ProgressBarVariant,
} from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface AttributesPanelProps {
  stats: RPGStats;
}

export const AttributesPanel: React.FC<AttributesPanelProps> = ({ stats }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const statItems: Array<{
    key: keyof RPGStats;
    label: string;
    desc: string;
    icon: React.ReactNode;
    variant: ProgressBarVariant;
  }> = [
    {
      key: "activity",
      label: t.attributes.activity,
      desc: t.attributes.activityDesc,
      icon: <PixelZap className="w-4 h-4 text-amber-400" />,
      variant: "stat",
    },
    {
      key: "experience",
      label: t.attributes.experience,
      desc: t.attributes.experienceDesc,
      icon: <PixelTome className="w-4 h-4 text-purple-400" />,
      variant: "arcane",
    },
    {
      key: "reputation",
      label: t.attributes.reputation,
      desc: t.attributes.reputationDesc,
      icon: <PixelStar className="w-4 h-4 text-yellow-300" />,
      variant: "xp",
    },
    {
      key: "versatility",
      label: t.attributes.versatility,
      desc: t.attributes.versatilityDesc,
      icon: <PixelLayers className="w-4 h-4 text-cyan-400" />,
      variant: "mp",
    },
    {
      key: "consistency",
      label: t.attributes.consistency,
      desc: t.attributes.consistencyDesc,
      icon: <PixelCalendar className="w-4 h-4 text-emerald-400" />,
      variant: "hp",
    },
  ];

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-rpg-border pb-3">
        <h2 className="font-pixel text-xs sm:text-sm text-rpg-gold uppercase tracking-wider">
          {t.character.attributesTitle}
        </h2>
        <span className="font-mono text-xs text-slate-400">{t.character.scale}</span>
      </div>

      <div className="space-y-4 pt-1">
        {statItems.map((stat) => (
          <div key={stat.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Tooltip content={stat.desc} side="top">
                <span className="flex items-center gap-2 font-sans font-bold text-sm text-slate-200 hover:text-amber-400 transition-colors cursor-help">
                  {stat.icon}
                  <span>{stat.label}</span>
                </span>
              </Tooltip>
              <span className="font-mono text-sm font-bold text-amber-400">{stats[stat.key]} / 100</span>
            </div>

            <ProgressBar
              value={stats[stat.key]}
              max={100}
              variant={stat.variant}
              showValueText={false}
              size="sm"
              aria-label={stat.label}
            />
          </div>
        ))}
      </div>
    </Card>
  );
};
