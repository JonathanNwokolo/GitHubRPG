"use client";

import React, { useState } from "react";
import { Button, Dialog, RpgIconFrame, RpgLock, RpgShare, RpgUnlock } from "@/design-system";
import type { PublicAchievementV2Localized } from "@/game-v2/publicProjection";
import type { AchievementProgress } from "@/game/types";
import { ProfileSectionHeader } from "@/features/profile-ui";
import { ProgressDetail } from "@/features/progress/ProgressDetail";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

const badge = { common: "common", rare: "rare", epic: "epic", legendary: "legendary", mythic: "arcane" } as const;

export function AchievementsGridV2({ achievements, legacyAchievements, onShareAchievement }: {
  achievements: PublicAchievementV2Localized[];
  legacyAchievements: AchievementProgress[];
  onShareAchievement?: (achievement: PublicAchievementV2Localized) => void;
}) {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const text = language === "pt-BR" ? "pt" : "en";
  const [filter, setFilter] = useState<PublicAchievementV2Localized["rarity"] | "all">("all");
  const [selected, setSelected] = useState<PublicAchievementV2Localized | null>(null);
  const filtered = filter === "all" ? achievements : achievements.filter((item) => item.rarity === filter);
  const legacyById = new Map(legacyAchievements.map((achievement) => [achievement.id, achievement]));
  const selectedLegacy = selected?.origin === "v1" ? legacyById.get(selected.id) : undefined;

  return (
    <div className="space-y-6">
      <ProfileSectionHeader variant="quiet" title={t.achievements.title} subtitle={t.achievements.subtitle} />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <p className="font-mono text-xs text-amber-400">
          {t.achievements.unlocked}: {achievements.filter((item) => item.unlocked).length} / {achievements.length}
        </p>
        <div role="group" aria-label={t.achievements.rarityLabel} className="flex flex-wrap gap-1.5">
          {(["all", "common", "rare", "epic", "legendary", "mythic"] as const).map((rarity) => (
            <Button
              key={rarity}
              size="sm"
              variant={filter === rarity ? "primary" : "ghost"}
              aria-pressed={filter === rarity}
              onClick={() => setFilter(rarity)}
            >
              {rarity === "all" ? t.achievements.filterAll : t.gameV2.rarities[rarity]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((achievement) => (
          <div key={achievement.id} className="group relative flex">
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
                    {t.gameV2.rarities[achievement.rarity]}
                  </span>
                  {achievement.unlocked ? (
                    <RpgIconFrame size="sm" shape="circle" rarity={badge[achievement.rarity]} glow>
                      <RpgUnlock className="h-3.5 w-3.5" />
                    </RpgIconFrame>
                  ) : (
                    <RpgIconFrame size="sm" shape="circle" rarity="common">
                      <RpgLock className="h-3.5 w-3.5 text-slate-400" />
                    </RpgIconFrame>
                  )}
                </div>

                <div>
                  <h3
                    className={`font-sans text-sm font-bold leading-snug tracking-wide transition-colors ${
                      achievement.unlocked
                        ? "text-amber-100 group-hover:text-amber-300"
                        : "text-slate-300"
                    }`}
                  >
                    {achievement.name[text]}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300/90">
                    {achievement.description[text]}
                  </p>
                </div>
              </div>

              <div className="mt-auto border-t border-[#4a3822]/60 pt-2.5">
                {achievement.origin === "v1" && legacyById.has(achievement.id) ? (
                  <ProgressDetail progress={legacyById.get(achievement.id)!} compact tone="profile" />
                ) : (
                  <p className="font-mono text-xs font-bold text-amber-400">
                    {achievement.unlocked ? t.progress.unlocked : t.progress.locked}
                  </p>
                )}
              </div>
            </button>

            {achievement.unlocked && achievement.origin === "v1" && onShareAchievement && (
              <button
                type="button"
                onClick={() => onShareAchievement(achievement)}
                aria-label={`${t.shareCard.achievementAction.replace("{name}", achievement.name[text])}`}
                className="absolute bottom-2.5 right-2.5 pf-share-badge-btn opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold z-10"
              >
                <RpgShare className="h-3.5 w-3.5" />
                <span>{t.shareCard.shareAction}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name[text]}
        description={selected ? `${t.achievements.rarityLabel}: ${t.gameV2.rarities[selected.rarity]}` : undefined}
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
                    <RpgIconFrame size="sm" shape="circle" rarity={badge[selected.rarity]} glow>
                      <RpgUnlock className="h-4 w-4" />
                    </RpgIconFrame>
                  ) : (
                    <RpgIconFrame size="sm" shape="circle" rarity="common">
                      <RpgLock className="h-4 w-4 text-slate-400" />
                    </RpgIconFrame>
                  )}
                  <span className={`pf-seal pf-seal--rarity-${selected.rarity}`}>
                    {t.gameV2.rarities[selected.rarity]}
                  </span>
                </div>
                <span className="font-sans text-xs font-bold text-amber-400">
                  {selected.unlocked ? t.progress.unlocked : t.progress.locked}
                </span>
              </div>
              <p className="font-sans text-sm text-slate-100 font-medium leading-relaxed">
                {selected.description[text]}
              </p>
              {selectedLegacy ? (
                <ProgressDetail progress={selectedLegacy} tone="profile" />
              ) : (
                <p className="font-mono text-xs font-bold text-amber-300">
                  {selected.unlocked ? t.progress.unlocked : t.progress.locked}
                </p>
              )}
              {selected.secret && !selected.unlocked && (
                <p className="font-sans text-xs text-slate-400 italic">{t.gameV2.secretHidden}</p>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
