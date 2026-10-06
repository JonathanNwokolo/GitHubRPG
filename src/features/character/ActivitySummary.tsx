"use client";

import React from "react";
import type { RPGSummary } from "@/game/types";
import {
  Card,
  RpgIconFrame,
  RpgGitCommit,
  RpgCastle,
  RpgStar,
  RpgMana,
  RpgCalendar,
  type IconRarity,
} from "@/design-system";
import { formatMetric, localeOf, pluralize } from "@/lib/format";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface ActivitySummaryProps {
  summary: RPGSummary;
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({ summary }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const formattedDate = new Date(summary.accountCreatedAt).toLocaleDateString(localeOf(language), {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const streak = formatMetric(summary.currentStreakDays, language);

  const stats: Array<{
    label: string;
    value: string;
    partial: boolean;
    rarity: IconRarity;
    icon: React.ReactNode;
  }> = [
    {
      label: t.character.totalCommits,
      value: formatMetric(summary.commits, language),
      partial: summary.commits.coverage === "partial",
      rarity: "gold",
      icon: <RpgGitCommit className="w-4 h-4 text-amber-400" />,
    },
    {
      label: t.character.publicRepos,
      value: formatMetric(summary.ownRepositories, language),
      partial: summary.ownRepositories.coverage === "partial",
      rarity: "arcane",
      icon: <RpgCastle className="w-4 h-4 text-purple-400" />,
    },
    {
      label: t.character.starsEarned,
      value: formatMetric(summary.starsReceived, language),
      partial: summary.starsReceived.coverage === "partial",
      rarity: "legendary",
      icon: <RpgStar className="w-4 h-4 text-yellow-300" />,
    },
    {
      label: t.character.streakDays,
      value:
        summary.currentStreakDays.coverage === "unavailable"
          ? streak
          : `${streak} ${pluralize(summary.currentStreakDays.value, t.character.days)}`,
      partial: summary.currentStreakDays.coverage === "partial",
      rarity: "crimson",
      icon: <RpgMana className="w-4 h-4 text-red-400" />,
    },
    {
      label: t.character.joinedDate,
      value: formattedDate,
      partial: false,
      rarity: "emerald",
      icon: <RpgCalendar className="w-4 h-4 text-emerald-400" />,
    },
  ];

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-rpg-border pb-3">
        <h2 className="font-pixel text-xs sm:text-sm text-rpg-gold uppercase tracking-wider">
          {t.character.activitySummaryTitle}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((item) => (
          <div
            key={item.label}
            title={item.partial ? t.progress.partialNote : undefined}
            className="p-3.5 bg-rpg-surface border border-rpg-border flex flex-col items-center justify-center text-center space-y-1.5 shadow-sm hover:border-rpg-borderLight transition-colors"
          >
            <RpgIconFrame size="md" shape="slate" rarity={item.rarity} glow>
              {item.icon}
            </RpgIconFrame>
            <p className="font-mono text-base sm:text-lg text-amber-400 font-bold truncate max-w-full">
              {item.value}
            </p>
            <p className="font-sans text-xs text-slate-300 font-medium leading-tight">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
