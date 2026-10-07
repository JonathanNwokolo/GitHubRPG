"use client";

import React, { useState } from "react";
import { Badge, Button, Card, Dialog, RpgIconFrame, RpgLock, RpgShare, RpgUnlock } from "@/design-system";
import type { PublicAchievementV2Localized } from "@/game-v2/publicProjection";
import type { AchievementProgress } from "@/game/types";
import { ProfileSectionHeader } from "@/features/profile-ui";
import { ProgressDetail } from "@/features/progress/ProgressDetail";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

const border = {
  common: "border-slate-500",
  rare: "border-sky-400 shadow-pixel-azure",
  epic: "border-purple-400 shadow-pixel-arcane",
  legendary: "border-amber-400 shadow-pixel-gold",
  mythic: "border-fuchsia-300 shadow-pixel-arcane",
} as const;

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

  return <div className="space-y-6">
    <ProfileSectionHeader variant="quiet" title={t.achievements.title} subtitle={t.achievements.subtitle} />
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <p className="font-mono text-xs text-amber-400">{t.achievements.unlocked}: {achievements.filter((item) => item.unlocked).length} / {achievements.length}</p>
      <div role="group" aria-label={t.achievements.rarityLabel} className="flex flex-wrap gap-1.5">
        {(["all", "common", "rare", "epic", "legendary", "mythic"] as const).map((rarity) => (
          <Button key={rarity} size="sm" variant={filter === rarity ? "primary" : "ghost"} aria-pressed={filter === rarity} onClick={() => setFilter(rarity)}>
            {rarity === "all" ? t.achievements.filterAll : t.gameV2.rarities[rarity]}
          </Button>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((achievement) => <div key={achievement.id} className="group relative">
        <button type="button" onClick={() => setSelected(achievement)} className={`flex h-full w-full flex-col gap-3 border-2 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold ${achievement.unlocked ? `bg-rpg-surface ${border[achievement.rarity]}` : "border-rpg-border/40 bg-rpg-void"}`}>
          <div className="flex items-center justify-between">
            <Badge variant={badge[achievement.rarity]} size="sm">{t.gameV2.rarities[achievement.rarity]}</Badge>
            <RpgIconFrame size="xs" shape="circle" rarity={achievement.unlocked ? badge[achievement.rarity] : "common"} glow={achievement.unlocked}>
              {achievement.unlocked ? <RpgUnlock className="h-3.5 w-3.5" /> : <RpgLock className="h-3.5 w-3.5 text-slate-500" />}
            </RpgIconFrame>
          </div>
          <div><h3 className="font-sans text-sm font-bold text-slate-100">{achievement.name[text]}</h3><p className="mt-1 text-xs leading-relaxed text-slate-300">{achievement.description[text]}</p></div>
          <div className="mt-auto border-t border-rpg-border/60 pt-2">
            {achievement.origin === "v1" && legacyById.has(achievement.id)
              ? <ProgressDetail progress={legacyById.get(achievement.id)!} compact />
              : <p className="text-xs font-bold text-slate-400">{achievement.unlocked ? t.progress.unlocked : t.progress.locked}</p>}
          </div>
        </button>
        {achievement.unlocked && achievement.origin === "v1" && onShareAchievement && <button type="button" onClick={() => onShareAchievement(achievement)} aria-label={`${t.shareCard.achievementAction.replace("{name}", achievement.name[text])}`} className="absolute bottom-2 right-2 inline-flex min-h-9 items-center gap-1 border border-rpg-border bg-rpg-obsidian px-2 text-xs font-bold text-amber-300 focus-visible:ring-2 focus-visible:ring-rpg-gold"><RpgShare className="h-3.5 w-3.5" />{t.shareCard.shareAction}</button>}
      </div>)}
    </div>
    <Dialog isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name[text]} description={selected ? `${t.achievements.rarityLabel}: ${t.gameV2.rarities[selected.rarity]}` : undefined} closeLabel={t.common.closeDialog}>
      {selected && <Card className="space-y-3"><p className="text-sm text-slate-100">{selected.description[text]}</p>{selectedLegacy ? <ProgressDetail progress={selectedLegacy} /> : <p className="text-xs font-bold text-amber-300">{selected.unlocked ? t.progress.unlocked : t.progress.locked}</p>}{selected.secret && !selected.unlocked && <p className="text-xs text-slate-400">{t.gameV2.secretHidden}</p>}</Card>}
    </Dialog>
  </div>;
}
