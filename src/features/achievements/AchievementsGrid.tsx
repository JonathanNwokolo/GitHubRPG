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
} from "@/design-system";
import { ProgressDetail } from "@/features/progress/ProgressDetail";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface AchievementsGridProps {
  achievements: AchievementProgress[];
}

const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-slate-500 shadow-sm",
  rare: "border-sky-400 shadow-pixel-azure",
  epic: "border-purple-400 shadow-pixel-arcane",
  legendary: "border-amber-400 shadow-pixel-gold",
};

export const AchievementsGrid: React.FC<AchievementsGridProps> = ({ achievements }) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-rpg-border pb-4">
        <div>
          <h2 className="font-pixel text-sm sm:text-base text-rpg-gold uppercase tracking-wider">
            {t.achievements.title}
          </h2>
          <p className="font-sans text-xs text-rpg-parchmentMuted">{t.achievements.subtitle}</p>
          <p className="font-mono text-xs text-amber-400 mt-2">
            {t.achievements.unlocked}: {unlockedCount} / {achievements.length}
          </p>
        </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((achievement) => (
          <button
            key={achievement.id}
            type="button"
            onClick={() => setSelected(achievement)}
            className={`w-full text-left p-4 border-2 transition-all flex flex-col justify-between gap-3 group relative overflow-hidden ${
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
        ))}
      </div>

      <Dialog
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description={selected ? `${t.achievements.rarityLabel}: ${t.rarity[selected.rarity]}` : undefined}
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

            <div className="flex justify-end">
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
