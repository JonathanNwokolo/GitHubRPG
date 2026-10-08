"use client";

import React from "react";
import type { ClassName, RPGCharacter, TitleProgress } from "@/game/types";
import {
  Badge,
  Tooltip,
  RpgShare,
  RpgSparkles,
  RpgTome,
  RpgCode,
  RpgMapPin,
  RpgBuilding,
  RpgHeart,
  RpgMana,
  RpgStar,
  RpgSwords,
  RpgClassIcon,
} from "@/design-system";
import { fnv1a } from "@/data/seed/hashAndPrng";
import { AVATAR_SLOT_RATIO, getAvatarFrameBottomOverflow } from "@/features/avatar";
import { fill, formatNumber } from "@/lib/format";
import {
  ProfileActionButton,
  ProfileDivider,
  ProfileHeroPanel,
  ProfileMeter,
  ProfileStatPlate,
  type ProfileMeterTone,
} from "@/features/profile-ui";
import { CharacterAvatar } from "./CharacterAvatar";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import type { RPGCharacterV2Public } from "@/game-v2/publicProjection";

interface CharacterHeaderProps {
  character: RPGCharacter;
  /** Title chosen for display (user pick or engine default). */
  equippedTitle: Pick<TitleProgress, "name"> | null;
  v2?: RPGCharacterV2Public | null;
  onOpenShareModal?: () => void;
  /** Opens "Why this class?". The trigger only exists when the host wires it. */
  onOpenClassExplanation?: () => void;
  /** Opens "Add to README". */
  onOpenReadmeModal?: () => void;
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

/** Size of the avatar window; the framed slot around it is larger. */
const AVATAR_SIZE = 112;

interface ResourceRowProps {
  tone: ProfileMeterTone;
  label: React.ReactNode;
  /** Plain-text name of the bar. */
  name: string;
  valueText: string;
  value: number;
  max: number;
  hint?: string;
}

/** Label and value on one line, the metal meter under them. */
const ResourceRow: React.FC<ResourceRowProps> = ({ tone, label, name, valueText, value, max, hint }) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-sans text-xs font-bold uppercase tracking-wider text-amber-50">{label}</span>
      <span className="font-mono text-xs font-medium text-amber-300">{valueText}</span>
    </div>
    <ProfileMeter value={value} max={max} tone={tone} size="md" aria-label={name} />
    {hint && <p className="pf-muted font-sans text-xs">{hint}</p>}
  </div>
);

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({
  character,
  equippedTitle,
  v2,
  onOpenShareModal,
  onOpenClassExplanation,
  onOpenReadmeModal,
}) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const { identity, progression, archetype, resources, meta } = character;
  const displayName = identity.displayName ?? identity.username;
  // Text and icon share one source: V2 when present, otherwise V1. The V2 projection types the class as a plain
  // string; RpgClassIcon falls back to the generic insignia for anything outside the known classes.
  const className = v2?.identity.className ?? archetype.className;
  const classIconType = className as ClassName;
  // With a V2 result the subclass comes only from V2 (null means none): the V1 subclass must not leak in,
  // or the sheet would show a specialization the "Why this class?" dialog (also V2) says does not exist.
  const subclassName = v2
    ? v2.identity.subclass?.name[language === "pt-BR" ? "pt" : "en"] ?? null
    : archetype.subclassName;
  const evolutionName = v2?.identity.evolution?.name[language === "pt-BR" ? "pt" : "en"];
  // The tooltip follows the same source as the class itself. V1 describes the V1 class only; with a V2 result the
  // V2 reason for the class is used instead, and when it is missing there is no tooltip rather than a V1 description
  // of a class the sheet no longer shows.
  const classDescription = v2 ? v2.explanation.class.reason[language === "pt-BR" ? "pt" : "en"]?.trim() || null : archetype.classDescription;

  const classLabel = (
    <span className="inline-flex items-center gap-1.5 font-sans text-sm font-extrabold uppercase tracking-wider text-amber-300">
      <RpgClassIcon classNameType={classIconType} className="h-4 w-4 text-amber-300" />
      <span>{className}</span>
    </span>
  );

  // The level plate hangs a constant 10px under the frame's visible edge, whichever frame this hero has.
  const plateOffset = Math.round(getAvatarFrameBottomOverflow(identity.username) * (AVATAR_SIZE / AVATAR_SLOT_RATIO)) + 10;

  const xpHint =
    progression.nextLevel === null
      ? t.character.maxLevel
      : fill(t.character.xpToNext, {
          n: formatNumber(progression.xpRemaining, language),
          level: progression.nextLevel,
        });

  return (
    <ProfileHeroPanel aria-label={displayName}>
      <div className="pf-hero__grid">
        {/* Portrait: the deterministic frame stays the protagonist; the level plate hangs under it. */}
        <div className="pf-hero__portrait">
          <div className="pf-avatar-aura">
            <CharacterAvatar
              seed={fnv1a(identity.username.toLowerCase())}
              photoUrl={identity.avatarUrl}
              username={identity.username}
              photoAlt={fill(t.character.avatarAlt, { name: displayName })}
              size={AVATAR_SIZE}
              rarity={TIER_FRAME[progression.tier] ?? "common"}
            />
          </div>
          <div className="flex flex-col items-center gap-1.5" style={{ marginTop: plateOffset }}>
            <ProfileStatPlate label={t.character.level} value={progression.level} />
            <span className="font-sans text-[11px] font-bold uppercase tracking-widest text-amber-300">{progression.tier}</span>
          </div>
        </div>

        {/* Identity */}
        <div className="pf-hero__identity space-y-2.5 text-center md:text-left">
          <div>
            <h1 className="break-words font-pixel text-xl leading-snug text-amber-50 sm:text-2xl lg:text-3xl xl:text-2xl">{displayName}</h1>
            <p className="mt-1 font-mono text-xs text-slate-400 sm:text-sm">@{identity.username}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:justify-start">
            {classDescription ? (
              <Tooltip content={classDescription} className={v2 ? "max-w-xs whitespace-normal" : undefined}>
                {classLabel}
              </Tooltip>
            ) : (
              classLabel
            )}
            {subclassName && (
              <>
                <span aria-hidden="true" className="text-amber-700">
                  &bull;
                </span>
                <Tooltip content={v2 ? t.gameV2.subclass : archetype.subclassDescription ?? subclassName}>
                  <span className="inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-slate-200">
                    {!v2 && <RpgClassIcon classNameType={archetype.subclassName ?? archetype.className} className="h-4 w-4 text-slate-300" />}
                    <span>{subclassName}</span>
                  </span>
                </Tooltip>
              </>
            )}
            {evolutionName && (
              <Badge variant="arcane" size="sm" className="gap-1" title={t.gameV2.evolution}>
                <RpgSparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.gameV2.evolution}: {evolutionName}</span>
              </Badge>
            )}
            {meta.isDemo && (
              <Badge variant="common" size="sm" className="gap-1" title={t.common.demoDataTooltip}>
                <RpgSparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{t.common.demoDataDisclaimer}</span>
              </Badge>
            )}
          </div>

          {equippedTitle ? (
            <p
              className="font-serif text-base font-semibold italic text-amber-300/95 sm:text-lg"
              aria-label={`${t.character.title}: ${equippedTitle.name}`}
            >
              &laquo; {equippedTitle.name} &raquo;
            </p>
          ) : (
            <p className="font-serif text-sm italic text-slate-400">{t.character.noTitle}</p>
          )}

          {identity.bio && (
            <p className="max-w-2xl font-sans text-sm leading-relaxed text-slate-300 md:max-w-xl">{identity.bio}</p>
          )}

          {(identity.location || identity.company) && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-0.5 text-xs text-slate-300 sm:text-sm md:justify-start">
              {identity.location && (
                <span className="flex items-center gap-1.5">
                  <RpgMapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>{identity.location}</span>
                </span>
              )}
              {identity.company && (
                <span className="flex items-center gap-1.5">
                  <RpgBuilding className="h-3.5 w-3.5 text-purple-400" />
                  <span>{identity.company}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status: XP, HP and MP (HP and MP are only a visual layer) */}
        <div className="pf-hero__status space-y-3.5">
          <div className="xl:hidden">
            <ProfileDivider maxWidth={420} className="md:mx-0" />
          </div>
          <ResourceRow
            tone="bright"
            label={
              <span className="inline-flex items-center gap-1.5">
                <RpgStar className="h-3.5 w-3.5 text-amber-400" />
                <span>{t.character.xp}</span>
              </span>
            }
            name={t.character.xp}
            value={progression.progressPercent}
            max={100}
            valueText={fill(t.character.xpTotal, { n: formatNumber(progression.totalXp, language) })}
            hint={xpHint}
          />
          <ResourceRow
            tone="hp"
            label={
              <span className="inline-flex items-center gap-1.5">
                <RpgHeart className="h-3.5 w-3.5 text-red-400" />
                <span>{t.character.hp}</span>
              </span>
            }
            name={t.character.hp}
            value={resources.hp}
            max={resources.maxHp}
            valueText={`${resources.hp} / ${resources.maxHp} HP`}
          />
          <ResourceRow
            tone="mp"
            label={
              <span className="inline-flex items-center gap-1.5">
                <RpgMana className="h-3.5 w-3.5 text-cyan-400" />
                <span>{t.character.mp}</span>
              </span>
            }
            name={t.character.mp}
            value={resources.mp}
            max={resources.maxMp}
            valueText={`${resources.mp} / ${resources.maxMp} MP`}
          />
          <p className="pf-muted font-sans text-[11px] leading-snug">{t.character.resourcesNote}</p>
        </div>

        {/* Actions: the duel and the card first (what a visitor wants to do), the utilities after them */}
        <div className="pf-hero__actions flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ProfileActionButton href={`/duel?opponent=${encodeURIComponent(identity.username)}`} variant="duel">
            <RpgSwords className="h-4 w-4" />
            <span>{t.duel.challengeHero}</span>
          </ProfileActionButton>
          {onOpenShareModal && (
            <ProfileActionButton variant="primary" onClick={onOpenShareModal}>
              <RpgShare className="h-4 w-4" />
              <span>{t.share.generateCard}</span>
            </ProfileActionButton>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {onOpenReadmeModal && (
              <ProfileActionButton variant="secondary" onClick={onOpenReadmeModal}>
                <RpgCode className="h-4 w-4" />
                <span>{t.readme.trigger}</span>
              </ProfileActionButton>
            )}
            {onOpenClassExplanation && (
              <ProfileActionButton variant="small" onClick={onOpenClassExplanation}>
                <RpgTome className="h-3.5 w-3.5" />
                <span>{t.classExplanation.trigger}</span>
              </ProfileActionButton>
            )}
          </div>
        </div>
      </div>
    </ProfileHeroPanel>
  );
};
