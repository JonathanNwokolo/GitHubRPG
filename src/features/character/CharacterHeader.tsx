"use client";

import React from "react";
import type { RPGCharacter, TitleProgress } from "@/game/types";
import {
  Badge,
  ProgressBar,
  Button,
  Card,
  Tooltip,
  RpgShare,
  RpgSparkles,
  RpgMapPin,
  RpgBuilding,
  RpgHeart,
  RpgMana,
  RpgStar,
  RpgClassIcon,
} from "@/design-system";
import { fnv1a } from "@/data/seed/hashAndPrng";
import { fill, formatNumber } from "@/lib/format";
import { CharacterAvatar } from "./CharacterAvatar";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface CharacterHeaderProps {
  character: RPGCharacter;
  /** Title chosen for display (user pick or engine default). */
  equippedTitle: TitleProgress | null;
  onOpenShareModal?: () => void;
}

/** Frame style per level tier (purely cosmetic, the tier itself comes from the engine). */
const TIER_FRAME: Record<string, "common" | "rare" | "epic" | "legendary"> = {
  Iniciante: "common",
  Aventureiro: "common",
  Experiente: "rare",
  Veterano: "rare",
  Mestre: "epic",
  Elite: "epic",
  Lendário: "legendary",
  Ascendente: "legendary",
};

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({
  character,
  equippedTitle,
  onOpenShareModal,
}) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const { identity, progression, archetype, resources, meta } = character;
  const displayName = identity.displayName ?? identity.username;

  const xpHint =
    progression.nextLevel === null
      ? t.character.maxLevel
      : fill(t.character.xpToNext, {
          n: formatNumber(progression.xpRemaining, language),
          level: progression.nextLevel,
        });

  return (
    <Card variant="rune" className="p-6 md:p-8 space-y-6">
      {/* Top Banner: Identity & Core Details */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        {/* GitHub photo inside the RPG frame (procedural avatar as fallback) */}
        <div className="flex-shrink-0">
          <CharacterAvatar
            seed={fnv1a(identity.username.toLowerCase())}
            photoUrl={identity.avatarUrl}
            photoAlt={fill(t.character.avatarAlt, { name: displayName })}
            size={100}
            rarity={TIER_FRAME[progression.tier] ?? "common"}
          />
        </div>

        {/* Identity block */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <Badge variant="gold" size="md">
              NÍVEL {progression.level}
            </Badge>

            <Badge variant="azure" size="md">
              {progression.tier}
            </Badge>

            <Tooltip content={archetype.classDescription}>
              <Badge variant="arcane" size="md" className="gap-1.5">
                <RpgClassIcon classNameType={archetype.className} className="w-4 h-4 text-purple-300" />
                <span>{archetype.className}</span>
              </Badge>
            </Tooltip>

            {archetype.subclassName && (
              <Tooltip content={archetype.subclassDescription ?? archetype.subclassName}>
                <Badge variant="neutral" size="md" className="gap-1.5">
                  <RpgClassIcon classNameType={archetype.subclassName} className="w-4 h-4 text-slate-300" />
                  <span>{archetype.subclassName}</span>
                </Badge>
              </Tooltip>
            )}

            {meta.isDemo && (
              <Badge variant="common" size="sm" className="ml-auto hidden sm:inline-flex gap-1" title={t.common.demoDataTooltip}>
                <RpgSparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.common.demoDataDisclaimer}</span>
              </Badge>
            )}
          </div>

          <div>
            <h1 className="font-pixel text-xl sm:text-2xl text-rpg-gold tracking-wide">{displayName}</h1>
            {equippedTitle ? (
              <p
                className="font-serif italic font-semibold text-sm sm:text-base text-amber-300/95 mt-1"
                aria-label={`${t.character.title}: ${equippedTitle.name}`}
              >
                &laquo; {equippedTitle.name} &raquo;
              </p>
            ) : (
              <p className="font-serif italic text-sm text-slate-400 mt-1">{t.character.noTitle}</p>
            )}
            <p className="font-mono text-xs sm:text-sm text-slate-400 mt-0.5">@{identity.username}</p>
          </div>

          {identity.bio && (
            <p className="font-sans text-sm text-slate-300 leading-relaxed max-w-2xl">{identity.bio}</p>
          )}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-slate-300 pt-1">
            {identity.location && (
              <span className="flex items-center gap-1.5">
                <RpgMapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{identity.location}</span>
              </span>
            )}
            {identity.company && (
              <span className="flex items-center gap-1.5">
                <RpgBuilding className="w-3.5 h-3.5 text-purple-400" />
                <span>{identity.company}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        {onOpenShareModal && (
          <div className="md:self-start">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenShareModal}
              className="gap-2 whitespace-nowrap"
            >
              <RpgShare className="w-4 h-4 text-amber-400" />
              <span>{t.share.generateCard}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Resource & XP Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-rpg-border/70">
        {/* XP Bar */}
        <div className="space-y-1">
          <ProgressBar
            variant="xp"
            value={progression.progressPercent}
            max={100}
            label={
              <span className="inline-flex items-center gap-1.5">
                <RpgStar className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.character.xp}</span>
              </span>
            }
            valueFormatter={() => fill(t.character.xpTotal, { n: formatNumber(progression.totalXp, language) })}
          />
          <p className="font-sans text-xs text-slate-300">{xpHint}</p>
        </div>

        {/* HP Bar */}
        <div className="space-y-1">
          <ProgressBar
            variant="hp"
            value={resources.hp}
            max={resources.maxHp}
            label={
              <span className="inline-flex items-center gap-1.5">
                <RpgHeart className="w-3.5 h-3.5 text-red-400" />
                <span>{t.character.hp}</span>
              </span>
            }
            valueFormatter={(val, max) => `${val} / ${max} HP`}
          />
        </div>

        {/* MP Bar */}
        <div className="space-y-1">
          <ProgressBar
            variant="mp"
            value={resources.mp}
            max={resources.maxMp}
            label={
              <span className="inline-flex items-center gap-1.5">
                <RpgMana className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.character.mp}</span>
              </span>
            }
            valueFormatter={(val, max) => `${val} / ${max} MP`}
          />
        </div>
      </div>
      <p className="font-sans text-[11px] text-slate-500">{t.character.resourcesNote}</p>
    </Card>
  );
};
