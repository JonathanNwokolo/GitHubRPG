"use client";

import React from "react";
import type { RPGSummary } from "@/game/types";
import { ProfileSectionHeader, ProfileSummaryTile } from "@/features/profile-ui";
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
  }> = [
    {
      label: t.character.totalCommits,
      value: formatMetric(summary.commits, language),
      partial: summary.commits.coverage === "partial",
    },
    {
      label: t.character.publicRepos,
      value: formatMetric(summary.ownRepositories, language),
      partial: summary.ownRepositories.coverage === "partial",
    },
    {
      label: t.character.starsEarned,
      value: formatMetric(summary.starsReceived, language),
      partial: summary.starsReceived.coverage === "partial",
    },
    {
      label: t.character.streakDays,
      value:
        summary.currentStreakDays.coverage === "unavailable"
          ? streak
          : `${streak} ${pluralize(summary.currentStreakDays.value, t.character.days)}`,
      partial: summary.currentStreakDays.coverage === "partial",
    },
    {
      label: t.character.joinedDate,
      value: formattedDate,
      partial: false,
    },
  ];

  return (
    <section aria-labelledby="summary-title" className="space-y-8">
      <ProfileSectionHeader id="summary-title" title={t.character.activitySummaryTitle} />

      <ul className="pf-tiles mx-auto grid max-w-sm grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {stats.map((item) => (
          <ProfileSummaryTile
            key={item.label}
            value={item.value}
            label={item.label}
            hint={item.partial ? t.progress.partialNote : undefined}
          />
        ))}
      </ul>
    </section>
  );
};
