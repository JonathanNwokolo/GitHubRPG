"use client";

import React from "react";
import { Badge, Card, PixelCompass } from "@/design-system";
import type { AchievementProgress } from "@/game/types";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { ProgressDetail } from "./ProgressDetail";

interface NextMilestonesProps {
  milestones: AchievementProgress[];
}

export const NextMilestones: React.FC<NextMilestonesProps> = ({ milestones }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="border-b border-rpg-border pb-3">
        <h2 className="font-pixel text-xs sm:text-sm text-rpg-gold uppercase tracking-wider flex items-center gap-2">
          <PixelCompass className="w-4 h-4 text-amber-400" />
          {t.milestones.title}
        </h2>
        <p className="font-sans text-xs text-slate-400 mt-1">{t.milestones.subtitle}</p>
      </div>

      {milestones.length === 0 ? (
        <p className="font-sans text-sm text-slate-300">{t.milestones.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="p-3.5 bg-rpg-surface border border-rpg-border space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-sans font-bold text-sm text-slate-100">{milestone.name}</h3>
                <Badge variant={milestone.rarity} size="sm">
                  {t.rarity[milestone.rarity]}
                </Badge>
              </div>
              <p className="font-sans text-xs text-slate-300 leading-relaxed">{milestone.description}</p>
              <ProgressDetail progress={milestone} compact />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
