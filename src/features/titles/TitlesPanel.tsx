"use client";

import React from "react";
import type {
  CombinationTitleProgress,
  ThresholdTitleProgress,
  TitleCategory,
  TitleProgress,
} from "@/game/types";
import {
  Button,
  RpgIconFrame,
  RpgCheck,
  RpgLock,
  RpgTrophy,
  RpgClose,
} from "@/design-system";
import { ProgressDetail } from "@/features/progress/ProgressDetail";
import { ProfileActionButton, ProfileSectionHeader } from "@/features/profile-ui";
import { fill } from "@/lib/format";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation, type TranslationDictionary } from "@/i18n";

interface TitlesPanelProps {
  titles: TitleProgress[];
  /** Id of the title currently shown as the main one. */
  equippedTitleId: string | null;
  /** Engine's suggestion, tagged "Padrão". */
  defaultTitleId: string | null;
  /** True when the user explicitly picked a title (so "use default" is meaningful). */
  hasCustomPick: boolean;
  onEquip: (titleId: string) => void;
  onUseDefault: () => void;
}

function categoryLabel(category: TitleCategory, t: TranslationDictionary): string {
  const labels: Record<TitleCategory, string> = {
    reputation: t.titles.categoryReputation,
    activity: t.titles.categoryActivity,
    collaboration: t.titles.categoryCollaboration,
    versatility: t.titles.categoryVersatility,
    longevity: t.titles.categoryLongevity,
    class: t.titles.categoryClass,
  };
  return labels[category];
}

export const TitlesPanel: React.FC<TitlesPanelProps> = ({
  titles,
  equippedTitleId,
  defaultTitleId,
  hasCustomPick,
  onEquip,
  onUseDefault,
}) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const unlocked = titles.filter((title) => title.unlocked);
  const nextThresholds = titles.filter(
    (title): title is ThresholdTitleProgress => title.kind === "threshold" && title.isNext
  );
  const lockedCombinations = titles.filter(
    (title): title is CombinationTitleProgress => title.kind === "combination" && !title.unlocked
  );

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

      {/* Unlocked */}
      <section aria-labelledby="titles-unlocked" className="space-y-3.5">
        <h3 id="titles-unlocked" className="font-sans font-bold text-sm uppercase tracking-wider text-emerald-300">
          {t.titles.unlockedSection} ({unlocked.length})
        </h3>
        {unlocked.length === 0 ? (
          <p className="font-sans text-sm text-slate-400">{t.titles.emptyUnlocked}</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {unlocked.map((title) => {
              const isEquipped = title.id === equippedTitleId;
              return (
                <li key={title.id}>
                  <div
                    className={`pf-title-card ${
                      isEquipped ? "pf-title-card--equipped" : "pf-title-card--unlocked"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 pr-1">
                      <p className="font-sans font-bold text-sm flex items-center gap-2">
                        <RpgIconFrame
                          size="xs"
                          shape="circle"
                          rarity={isEquipped ? "gold" : "emerald"}
                          glow
                        >
                          <RpgCheck className="w-3.5 h-3.5" />
                        </RpgIconFrame>
                        <span
                          className={`truncate ${
                            isEquipped
                              ? "text-amber-100 font-extrabold tracking-wide"
                              : "text-slate-100"
                          }`}
                        >
                          {title.name}
                        </span>
                      </p>
                      <p className="font-sans text-xs text-slate-300/90 leading-relaxed">
                        {title.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        <span className="pf-seal">{categoryLabel(title.category, t)}</span>
                        {title.id === defaultTitleId && (
                          <span className="pf-seal pf-seal--default">{t.titles.defaultTag}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center shrink-0 self-center pl-2">
                      {isEquipped ? (
                        <span className="pf-seal pf-seal--equipped">
                          <RpgTrophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>{t.titles.equipped}</span>
                        </span>
                      ) : (
                        <ProfileActionButton
                          variant="small"
                          onClick={() => onEquip(title.id)}
                          aria-label={`${t.titles.equip}: ${title.name}`}
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
        )}
      </section>

      {/* Next title of each ladder */}
      {nextThresholds.length > 0 && (
        <section aria-labelledby="titles-progress" className="space-y-3.5">
          <h3 id="titles-progress" className="font-sans font-bold text-sm uppercase tracking-wider text-amber-300">
            {t.titles.inProgressSection}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {nextThresholds.map((title) => (
              <li key={title.id}>
                <div className="pf-title-card pf-title-card--progress flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <p className="font-sans font-bold text-sm text-slate-200 flex items-center gap-2 min-w-0">
                      <RpgIconFrame size="xs" shape="circle" rarity="common">
                        <RpgLock className="w-3.5 h-3.5 text-slate-400" />
                      </RpgIconFrame>
                      <span className="truncate">{title.name}</span>
                    </p>
                    <span className="pf-seal shrink-0">{categoryLabel(title.category, t)}</span>
                  </div>
                  <div className="w-full">
                    <ProgressDetail progress={title} tone="profile" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Class + subclass combinations (conditions are not numeric: no percentage) */}
      {lockedCombinations.length > 0 && (
        <section aria-labelledby="titles-combinations" className="space-y-3.5">
          <h3 id="titles-combinations" className="font-sans font-bold text-sm uppercase tracking-wider text-purple-300">
            {t.titles.combinationSection}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {lockedCombinations.map((title) => (
              <li key={title.id}>
                <div className="pf-title-card pf-title-card--progress flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 w-full">
                    <p className="font-sans font-bold text-sm text-slate-200 flex items-center gap-2 min-w-0">
                      <RpgIconFrame size="xs" shape="circle" rarity="common">
                        <RpgLock className="w-3.5 h-3.5 text-slate-400" />
                      </RpgIconFrame>
                      <span className="truncate">{title.name}</span>
                    </p>
                    <span className="pf-seal shrink-0">{categoryLabel("class", t)}</span>
                  </div>
                  <p className="font-sans text-xs text-slate-400">{t.titles.requirements}:</p>
                  <ul className="space-y-1.5 w-full">
                    {title.requirements.map((req) => (
                      <li
                        key={`${req.kind}-${req.value}`}
                        className={`font-sans text-xs flex items-center gap-2 px-2.5 py-1 rounded bg-black/30 border border-[#4a3822]/40 ${
                          req.met ? "text-emerald-300" : "text-slate-400"
                        }`}
                      >
                        {req.met ? (
                          <RpgCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-label={t.titles.requirementMet} />
                        ) : (
                          <RpgClose className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-label={t.titles.requirementPending} />
                        )}
                        <span>
                          {fill(req.kind === "class" ? t.titles.classReq : t.titles.subclassReq, {
                            value: req.value,
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
