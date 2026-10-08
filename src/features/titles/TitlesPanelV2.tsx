"use client";

import React from "react";
import { Button, RpgCheck, RpgIconFrame, RpgLock, RpgTrophy } from "@/design-system";
import type { PublicTitleV2Localized } from "@/game-v2/publicProjection";
import { ProfileActionButton, ProfileSectionHeader } from "@/features/profile-ui";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

const badge = { common: "common", rare: "rare", epic: "epic", legendary: "legendary", mythic: "arcane" } as const;

export function TitlesPanelV2({
  titles,
  equippedTitleId,
  defaultTitleId,
  hasCustomPick,
  onEquip,
  onUseDefault,
}: {
  titles: PublicTitleV2Localized[];
  equippedTitleId: string | null;
  defaultTitleId: string | null;
  hasCustomPick: boolean;
  onEquip: (id: string) => void;
  onUseDefault: () => void;
}) {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const text = language === "pt-BR" ? "pt" : "en";
  const unlocked = titles.filter((title) => title.unlocked);
  const locked = titles.filter((title) => !title.unlocked);

  return (
    <div className="space-y-8">
      <ProfileSectionHeader
        variant="quiet"
        title={t.titles.title}
        subtitle={t.titles.subtitle}
        aside={
          hasCustomPick ? (
            <Button size="sm" variant="ghost" onClick={onUseDefault}>
              {t.titles.useDefault}
            </Button>
          ) : undefined
        }
      />

      <section aria-labelledby="v2-titles-unlocked" className="space-y-3.5">
        <h3 id="v2-titles-unlocked" className="font-sans text-sm font-bold uppercase tracking-wider text-emerald-300">
          {t.titles.unlockedSection} ({unlocked.length})
        </h3>
        <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {unlocked.map((title) => {
            const equipped = title.id === equippedTitleId;
            return (
              <li key={title.id}>
                <div
                  className={`pf-title-card ${
                    equipped ? "pf-title-card--equipped" : "pf-title-card--unlocked"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 pr-1">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <RpgIconFrame
                        size="xs"
                        shape="circle"
                        rarity={equipped ? "gold" : badge[title.rarity]}
                        glow
                      >
                        <RpgCheck className="h-3.5 w-3.5" />
                      </RpgIconFrame>
                      <span
                        className={`truncate ${
                          equipped
                            ? "text-amber-100 font-extrabold tracking-wide"
                            : "text-slate-100"
                        }`}
                      >
                        {title.name[text]}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-slate-300/90 leading-relaxed">
                      {title.description[text]}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className={`pf-seal pf-seal--rarity-${title.rarity}`}>
                        {t.gameV2.rarities[title.rarity]}
                      </span>
                      {title.id === defaultTitleId && (
                        <span className="pf-seal pf-seal--default">{t.titles.defaultTag}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 self-center pl-2">
                    {equipped ? (
                      <span className="pf-seal pf-seal--equipped">
                        <RpgTrophy className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                        <span>{t.titles.equipped}</span>
                      </span>
                    ) : (
                      <ProfileActionButton
                        variant="small"
                        onClick={() => onEquip(title.id)}
                        aria-label={`${t.titles.equip}: ${title.name[text]}`}
                        className="shrink-0"
                      >
                        {t.titles.equip}
                      </ProfileActionButton>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {locked.length > 0 && (
        <section aria-labelledby="v2-titles-locked" className="space-y-3.5">
          <h3 id="v2-titles-locked" className="font-sans text-sm font-bold uppercase tracking-wider text-slate-400">
            {t.gameV2.lockedTitles} ({locked.length})
          </h3>
          <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {locked.map((title) => (
              <li key={title.id}>
                <div className="pf-title-card pf-title-card--progress gap-3">
                  <RpgIconFrame size="xs" shape="circle" rarity="common" className="shrink-0 mt-0.5">
                    <RpgLock className="h-3.5 w-3.5 text-slate-400" />
                  </RpgIconFrame>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-sans text-sm font-bold text-slate-200 truncate">
                        {title.name[text]}
                      </p>
                      <span className={`pf-seal pf-seal--rarity-${title.rarity} shrink-0`}>
                        {t.gameV2.rarities[title.rarity]}
                      </span>
                    </div>
                    <p className="mt-1 font-sans text-xs text-slate-400 leading-relaxed">
                      {title.description[text]}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
