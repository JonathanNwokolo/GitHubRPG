"use client";

import React, { useState } from "react";
import type { AchievementProgress, Rarity } from "@/game/types";
import {
  Dialog,
  Button,
  RpgIconFrame,
  RpgUnlock,
  RpgLock,
  RpgShare,
} from "@/design-system";
import { ProfileSectionHeader } from "@/features/profile-ui";
import { fill } from "@/lib/format";
import { ProgressDetail } from "@/features/progress/ProgressDetail";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface AchievementsGridProps {
  achievements: AchievementProgress[];
  /** Opens the share card of an UNLOCKED achievement. Without it, no share action is offered. */
  onShareAchievement?: (achievement: AchievementProgress) => void;
}

export const AchievementsGrid: React.FC<AchievementsGridProps> = ({ achievements, onShareAchievement }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [selected, setSelected] = useState<AchievementProgress | null>(null);

  const filtered =
    rarityFilter === "all" ? achievements : achievements.filter((a) => a.rarity === rarityFilter);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const filters: Array<{ key: Rarity | "all"; label: string }> = [
    { key: "all", label: t.achievements.filterAll },
    { key: "common", label: t.achievements.filterCommon },
    { key: "rare", label: t.achievements.filterRare },
    { key: "epic", label: t.achievements.filterEpic },
    { key: "legendary", label: t.achievements.filterLegendary },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <ProfileSectionHeader variant="quiet" title={t.achievements.title} subtitle={t.achievements.subtitle} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <p className="font-mono text-xs text-amber-400">
            {t.achievements.unlocked}: {unlockedCount} / {achievements.length}
          </p>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.achievements.rarityLabel}>
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={rarityFilter === f.key ? "primary" : "ghost"}
                aria-pressed={rarityFilter === f.key}
                onClick={() => setRarityFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((achievement) => (
          <div key={achievement.id} className="relative group flex">
            <button
              type="button"
              onClick={() => setSelected(achievement)}
              className={`pf-achievement-card pf-achievement-card--${achievement.rarity} ${
                achievement.unlocked
                  ? "pf-achievement-card--unlocked"
                  : "pf-achievement-card--locked"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`pf-seal pf-seal--rarity-${achievement.rarity}`}>
                    {t.rarity[achievement.rarity]}
                  </span>
                  {achievement.unlocked ? (
                    <RpgIconFrame size="sm" shape="circle" rarity={achievement.rarity} glow>
                      <RpgUnlock className="w-3.5 h-3.5" />
                    </RpgIconFrame>
                  ) : (
                    <RpgIconFrame size="sm" shape="circle" rarity="common">
                      <RpgLock className="w-3.5 h-3.5 text-slate-400" />
                    </RpgIconFrame>
                  )}
                </div>

                <div>
                  <h3
                    className={`font-sans font-bold text-sm leading-snug tracking-wide transition-colors ${
                      achievement.unlocked
                        ? "text-amber-100 group-hover:text-amber-300"
                        : "text-slate-300"
                    }`}
                  >
                    {achievement.name}
                  </h3>
                  <p className="font-sans text-xs text-slate-300/90 mt-1 leading-relaxed">
                    {achievement.description}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 mt-auto border-t border-[#4a3822]/60">
                <ProgressDetail progress={achievement} compact tone="profile" />
              </div>
            </button>

            {/* A sibling of the card button: visible on hover/focus, always on touch. */}
            {achievement.unlocked && onShareAchievement && (
              <button
                type="button"
                onClick={() => onShareAchievement(achievement)}
                aria-label={fill(t.shareCard.achievementAction, { name: achievement.name })}
                className="absolute bottom-2.5 right-2.5 pf-share-badge-btn opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold z-10"
              >
                <RpgShare className="w-3.5 h-3.5" />
                <span>{t.shareCard.shareAction}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description={selected ? `${t.achievements.rarityLabel}: ${t.rarity[selected.rarity]}` : undefined}
        closeLabel={t.common.closeDialog}
      >
        {selected && (
          <div className="space-y-4 py-2">
            <div
              className={`pf-achievement-card pf-achievement-card--${selected.rarity} ${
                selected.unlocked ? "pf-achievement-card--unlocked" : "pf-achievement-card--locked"
              } p-5 space-y-3.5`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selected.unlocked ? (
                    <RpgIconFrame size="sm" shape="circle" rarity={selected.rarity} glow>
                      <RpgUnlock className="w-4 h-4" />
                    </RpgIconFrame>
                  ) : (
                    <RpgIconFrame size="sm" shape="circle" rarity="common">
                      <RpgLock className="w-4 h-4 text-slate-400" />
                    </RpgIconFrame>
                  )}
                  <span className={`pf-seal pf-seal--rarity-${selected.rarity}`}>
                    {t.rarity[selected.rarity]}
                  </span>
                </div>
                <span className="font-sans text-xs font-bold text-amber-400">
                  {selected.unlocked ? t.progress.unlocked : t.progress.locked}
                </span>
              </div>
              <p className="font-sans text-sm text-slate-100 font-medium leading-relaxed">
                {selected.description}
              </p>
              <ProgressDetail progress={selected} tone="profile" />
              {selected.category === "reviews" && (
                <p className="font-sans text-xs text-slate-400 italic">{t.achievements.reviewsNote}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {selected.unlocked && onShareAchievement && (
                <Button
                  size="sm"
                  variant="primary"
                  className="gap-2"
                  onClick={() => {
                    const achievement = selected;
                    setSelected(null);
                    onShareAchievement(achievement);
                  }}
                >
                  <RpgShare className="w-4 h-4" />
                  <span>{t.shareCard.achievementTitle}</span>
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
                {t.common.close}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
