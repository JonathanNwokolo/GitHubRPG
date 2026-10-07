"use client";

import React, { useState } from "react";
import type { AchievementProgress, Rarity } from "@/game/types";
import {
  Card,
  Badge,
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

const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-slate-500 shadow-sm",
  rare: "border-sky-400 shadow-pixel-azure",
  epic: "border-purple-400 shadow-pixel-arcane",
  legendary: "border-amber-400 shadow-pixel-gold",
};

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
          <div key={achievement.id} className="relative group">
          <button
            type="button"
            onClick={() => setSelected(achievement)}
            className={`w-full h-full text-left p-4 border-2 transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
              achievement.unlocked
                ? `bg-rpg-surface hover:-translate-y-1 hover:shadow-lg ${RARITY_BORDER[achievement.rarity]}`
                : "bg-rpg-void border-rpg-border/40 hover:opacity-90"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={achievement.rarity} size="sm">
                  {t.rarity[achievement.rarity]}
                </Badge>
                {achievement.unlocked ? (
                  <RpgIconFrame size="xs" shape="circle" rarity={achievement.rarity} glow>
                    <RpgUnlock className="w-3.5 h-3.5" />
                  </RpgIconFrame>
                ) : (
                  <RpgIconFrame size="xs" shape="circle" rarity="common">
                    <RpgLock className="w-3.5 h-3.5 text-slate-500" />
                  </RpgIconFrame>
                )}
              </div>

              <div>
                <h3 className="font-sans font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors leading-snug">
                  {achievement.name}
                </h3>
                <p className="font-sans text-xs text-slate-300 mt-1 leading-relaxed">
                  {achievement.description}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-rpg-border/60">
              <ProgressDetail progress={achievement} compact />
            </div>
          </button>
          {/* A sibling of the card button (a button cannot hold a button): visible on hover/focus, always on touch. */}
          {achievement.unlocked && onShareAchievement && (
            <button
              type="button"
              onClick={() => onShareAchievement(achievement)}
              aria-label={fill(t.shareCard.achievementAction, { name: achievement.name })}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 min-h-[36px] min-w-[36px] justify-center bg-rpg-obsidian border border-rpg-border text-xs font-sans font-bold text-amber-300 hover:border-rpg-gold opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
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
            <Card
              className={`space-y-3 ${selected.unlocked ? "border-rpg-goldDark shadow-pixel-gold" : "opacity-90"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selected.unlocked ? (
                    <RpgIconFrame size="sm" shape="circle" rarity={selected.rarity} glow>
                      <RpgUnlock className="w-4 h-4" />
                    </RpgIconFrame>
                  ) : (
                    <RpgIconFrame size="sm" shape="circle" rarity="common">
                      <RpgLock className="w-4 h-4 text-slate-500" />
                    </RpgIconFrame>
                  )}
                  <Badge variant={selected.rarity}>{t.rarity[selected.rarity]}</Badge>
                </div>
                <span className="font-sans text-xs font-bold text-amber-400">
                  {selected.unlocked ? t.progress.unlocked : t.progress.locked}
                </span>
              </div>
              <p className="font-sans text-sm text-slate-100 font-medium leading-relaxed">
                {selected.description}
              </p>
              <ProgressDetail progress={selected} />
              {selected.category === "reviews" && (
                <p className="font-sans text-xs text-slate-400 italic">{t.achievements.reviewsNote}</p>
              )}
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
              {selected.unlocked && onShareAchievement && (
                <Button
                  size="sm"
                  variant="primary"
                  className="gap-2"
                  onClick={() => {
                    // One dialog at a time: the detail closes (returning focus to its card) and the share card opens.
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
