"use client";

import React from "react";
import type {
  CombinationTitleProgress,
  ThresholdTitleProgress,
  TitleCategory,
  TitleProgress,
} from "@/game/types";
import {
  Badge,
  Button,
  Card,
  RpgIconFrame,
  RpgCheck,
  RpgLock,
  RpgTrophy,
  RpgClose,
} from "@/design-system";
import { ProgressDetail } from "@/features/progress/ProgressDetail";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rpg-border pb-4">
        <div>
          <h2 className="font-pixel text-sm sm:text-base text-rpg-gold uppercase tracking-wider">
            {t.titles.title}
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-300 max-w-2xl">{t.titles.subtitle}</p>
        </div>
        {hasCustomPick && (
          <Button size="sm" variant="ghost" onClick={onUseDefault}>
            {t.titles.useDefault}
          </Button>
        )}
      </div>

      {/* Unlocked */}
      <section aria-labelledby="titles-unlocked" className="space-y-3">
        <h3 id="titles-unlocked" className="font-sans font-bold text-sm uppercase tracking-wider text-emerald-300">
          {t.titles.unlockedSection} ({unlocked.length})
        </h3>
        {unlocked.length === 0 ? (
          <p className="font-sans text-sm text-slate-400">{t.titles.emptyUnlocked}</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unlocked.map((title) => {
              const isEquipped = title.id === equippedTitleId;
              return (
                <li key={title.id}>
                  <Card
                    className={`flex items-start justify-between gap-3 ${
                      isEquipped ? "border-rpg-goldDark shadow-pixel-gold" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-sans font-bold text-sm text-slate-100 flex items-center gap-2">
                        <RpgIconFrame size="xs" shape="circle" rarity="emerald" glow>
                          <RpgCheck className="w-3.5 h-3.5" />
                        </RpgIconFrame>
                        <span>{title.name}</span>
                      </p>
                      <p className="font-sans text-xs text-slate-300">{title.description}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Badge variant="neutral" size="sm">
                          {categoryLabel(title.category, t)}
                        </Badge>
                        {title.id === defaultTitleId && (
                          <Badge variant="azure" size="sm">
                            {t.titles.defaultTag}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isEquipped ? (
                      <Badge variant="gold" size="md" className="gap-1 flex-shrink-0">
                        <RpgTrophy className="w-3.5 h-3.5" />
                        {t.titles.equipped}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onEquip(title.id)}
                        aria-label={`${t.titles.equip}: ${title.name}`}
                        className="flex-shrink-0"
                      >
                        {t.titles.equip}
                      </Button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Next title of each ladder */}
      {nextThresholds.length > 0 && (
        <section aria-labelledby="titles-progress" className="space-y-3">
          <h3 id="titles-progress" className="font-sans font-bold text-sm uppercase tracking-wider text-amber-300">
            {t.titles.inProgressSection}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nextThresholds.map((title) => (
              <li key={title.id}>
                <Card className="space-y-2 opacity-95">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-sans font-bold text-sm text-slate-200 flex items-center gap-2">
                      <RpgIconFrame size="xs" shape="circle" rarity="common">
                        <RpgLock className="w-3.5 h-3.5 text-slate-400" />
                      </RpgIconFrame>
                      <span>{title.name}</span>
                    </p>
                    <Badge variant="neutral" size="sm">
                      {categoryLabel(title.category, t)}
                    </Badge>
                  </div>
                  <ProgressDetail progress={title} />
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Class + subclass combinations (conditions are not numeric: no percentage) */}
      {lockedCombinations.length > 0 && (
        <section aria-labelledby="titles-combinations" className="space-y-3">
          <h3 id="titles-combinations" className="font-sans font-bold text-sm uppercase tracking-wider text-purple-300">
            {t.titles.combinationSection}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lockedCombinations.map((title) => (
              <li key={title.id}>
                <Card className="space-y-2 opacity-90">
                  <p className="font-sans font-bold text-sm text-slate-200 flex items-center gap-2">
                    <RpgIconFrame size="xs" shape="circle" rarity="common">
                      <RpgLock className="w-3.5 h-3.5 text-slate-400" />
                    </RpgIconFrame>
                    <span>{title.name}</span>
                  </p>
                  <p className="font-sans text-xs text-slate-400">{t.titles.requirements}:</p>
                  <ul className="space-y-1">
                    {title.requirements.map((req) => (
                      <li
                        key={`${req.kind}-${req.value}`}
                        className={`font-sans text-xs flex items-center gap-1.5 ${
                          req.met ? "text-emerald-300" : "text-slate-400"
                        }`}
                      >
                        {req.met ? (
                          <RpgCheck className="w-3.5 h-3.5 text-emerald-400" aria-label="ok" />
                        ) : (
                          <RpgClose className="w-3.5 h-3.5 text-slate-500" aria-label="pendente" />
                        )}
                        {fill(req.kind === "class" ? t.titles.classReq : t.titles.subclassReq, {
                          value: req.value,
                        })}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
