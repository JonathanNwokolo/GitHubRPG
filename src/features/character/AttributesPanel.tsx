"use client";

import React from "react";
import type { RPGStats } from "@/game/types";
import {
  Card,
  ProgressBar,
  Tooltip,
  RpgIconFrame,
  RpgZap,
  RpgTome,
  RpgStar,
  RpgLayers,
  RpgCalendar,
  type ProgressBarVariant,
  type IconRarity,
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
    rarity: IconRarity;
    variant: ProgressBarVariant;
  }> = [
    {
      key: "activity",
      label: t.attributes.activity,
      desc: t.attributes.activityDesc,
      icon: <RpgZap className="w-3.5 h-3.5" />,
      rarity: "gold",
      variant: "stat",
    },
    {
      key: "experience",
      label: t.attributes.experience,
      desc: t.attributes.experienceDesc,
      icon: <RpgTome className="w-3.5 h-3.5" />,
      rarity: "arcane",
      variant: "arcane",
    },
    {
      key: "reputation",
      label: t.attributes.reputation,
      desc: t.attributes.reputationDesc,
      icon: <RpgStar className="w-3.5 h-3.5" />,
      rarity: "legendary",
      variant: "xp",
    },
    {
      key: "versatility",
      label: t.attributes.versatility,
      desc: t.attributes.versatilityDesc,
      icon: <RpgLayers className="w-3.5 h-3.5" />,
      rarity: "azure",
      variant: "mp",
    },
    {
      key: "consistency",
      label: t.attributes.consistency,
      desc: t.attributes.consistencyDesc,
      icon: <RpgCalendar className="w-3.5 h-3.5" />,
      rarity: "emerald",
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
                <span className="flex items-center gap-2.5 font-sans font-bold text-sm text-slate-200 hover:text-amber-400 transition-colors cursor-help">
                  <RpgIconFrame size="sm" shape="hex" rarity={stat.rarity} glow>
                    {stat.icon}
                  </RpgIconFrame>
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
