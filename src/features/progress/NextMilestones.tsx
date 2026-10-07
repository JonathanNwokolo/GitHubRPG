"use client";

import React from "react";
import { Badge } from "@/design-system";
import type { AchievementProgress } from "@/game/types";
import { getTranslation } from "@/i18n";
import { ProfileMilestoneCard, ProfileSectionHeader } from "@/features/profile-ui";
import { useUiStore } from "@/stores/useUiStore";
import { ProgressDetail } from "./ProgressDetail";

interface NextMilestonesProps {
  milestones: AchievementProgress[];
}

export const NextMilestones: React.FC<NextMilestonesProps> = ({ milestones }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  return (
    <section aria-labelledby="milestones-title" className="space-y-7">
      <ProfileSectionHeader id="milestones-title" title={t.milestones.title} subtitle={t.milestones.subtitle} />

      {milestones.length === 0 ? (
        <p className="pf-muted text-center font-sans text-sm">{t.milestones.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-7 px-3.5 md:grid-cols-3">
          {milestones.map((milestone) => (
            <ProfileMilestoneCard key={milestone.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 font-sans text-base font-extrabold leading-snug text-amber-50">{milestone.name}</h3>
                <Badge variant={milestone.rarity} size="sm" className="shrink-0">
                  {t.rarity[milestone.rarity]}
                </Badge>
              </div>
              <p className="pf-muted font-sans text-sm leading-relaxed">{milestone.description}</p>
              <ProgressDetail progress={milestone} compact tone="profile" className="mt-auto pt-1" />
            </ProfileMilestoneCard>
          ))}
        </ul>
      )}
    </section>
  );
};
