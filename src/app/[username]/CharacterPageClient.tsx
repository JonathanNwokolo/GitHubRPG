"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { RPGCharacter } from "@/game/types";
import { CharacterHeader, AttributesPanel, ActivitySummary } from "@/features/character";
import type { ClassExplanation } from "@/features/character/classExplanation";
import { ClassExplanationDialog } from "@/features/character/ClassExplanationDialog";
import { CharacterTabs, CharacterActiveTab, CHARACTER_TABS_ID_PREFIX } from "@/features/character/CharacterTabs";
import { hasSparsePublicData } from "@/features/character/sparseProfile";
import { SkillsTree } from "@/features/skills/SkillsTree";
import { AchievementsGrid } from "@/features/achievements/AchievementsGrid";
import { ReadmeBadgeModal } from "@/features/badge/ReadmeBadgeModal";
import { SHARE_ACTIONS_ENABLED } from "./shareActions";
import { ShareImageModal } from "@/features/share/ShareImageModal";
import { resolveHeroIdentity } from "@/features/share/heroIdentity";
import type { ShareTarget } from "@/features/share/shareTarget";
import { TitlesPanel } from "@/features/titles/TitlesPanel";
import { resolveEquippedTitle } from "@/features/titles/equippedTitle";
import { ChronicleSection } from "@/features/chronicle/ChronicleSection";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import { ActivityFlameSection } from "@/features/activity-flame/ActivityFlameSection";
import type { ActivityFlameModel } from "@/features/activity-flame/types";
import { NextMilestones } from "@/features/progress/NextMilestones";
import { PixelArrowLeft, TabPanel } from "@/design-system";
import "@/features/profile-ui/profile-ui.css";
import { useUiStore } from "@/stores/useUiStore";
import { useTitleStore } from "@/stores/useTitleStore";
import { getTranslation } from "@/i18n";
import { resolvePublicEquippedTitle, type CharacterPresentationModel, type PublicAchievementV2Localized } from "@/game-v2/publicProjection";
import { GrimoireSection } from "@/features/character/GrimoireSection";
import { AchievementsGridV2 } from "@/features/achievements/AchievementsGridV2";
import { TitlesPanelV2 } from "@/features/titles/TitlesPanelV2";
import { useLiveCharacterPresentation } from "@/features/character/useLiveCharacterPresentation";
import { CharacterForgeLoading } from "@/features/character/CharacterForgeLoading";
import { resolveCharacterRenderMode } from "@/features/character/characterPresentationState";
import { localizeTitle } from "@/i18n/gameContent";

// The share dialogs are only needed once someone opens them: keep them out of the initial bundle.
const HeroShareDialog = dynamic(() => import("@/features/share/HeroShareDialog").then((mod) => mod.HeroShareDialog), {
  ssr: false,
  loading: () => null,
});

// The share modal (canvas drawing code) is only needed once someone opens it: keep it out of the initial bundle.
const ShareCardModal = dynamic(() => import("@/features/share/ShareCardModal").then((mod) => mod.ShareCardModal), {
  ssr: false,
  loading: () => null,
});

interface CharacterPageProps {
  character: RPGCharacter;
  chronicle: DeveloperChronicle;
  /** Absent for callers that have no calendar to show: the section is then simply not rendered. */
  activityFlame?: ActivityFlameModel;
  classExplanation: ClassExplanation;
  username: string;
  presentation?: CharacterPresentationModel;
}

const DEFAULT_PRESENTATION: CharacterPresentationModel = {
  v2Enabled: false,
  delivery: "unavailable",
  v2: null,
};

export default function CharacterPage({
  character,
  chronicle,
  activityFlame,
  classExplanation,
  username,
  presentation = DEFAULT_PRESENTATION,
}: CharacterPageProps) {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const livePresentation = useLiveCharacterPresentation(presentation, username);

  const savedTitleId = useTitleStore((state) => state.equippedByUser[username]);
  const equipTitle = useTitleStore((state) => state.equipTitle);
  const clearEquippedTitle = useTitleStore((state) => state.clearEquippedTitle);

  const [activeTab, setActiveTab] = useState<CharacterActiveTab>("overview");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHeroShareOpen, setIsHeroShareOpen] = useState(false);
  const [isClassExplanationOpen, setIsClassExplanationOpen] = useState(false);
  const [isReadmeModalOpen, setIsReadmeModalOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  /** The achievement or chapter whose card is open, if any. */
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const equippedTitle = useMemo(
    () => resolveEquippedTitle(character.titles, savedTitleId, character.defaultTitleId),
    [character, savedTitleId]
  );
  const localizedKey = language === "pt-BR" ? "pt" : "en";
  const equippedV2Title = useMemo(() => {
    if (!livePresentation.v2) return null;
    const title = resolvePublicEquippedTitle(livePresentation.v2.titles, savedTitleId, livePresentation.v2.defaultTitleId);
    return title ? { id: title.id, name: title.name[localizedKey] } : null;
  }, [livePresentation.v2, localizedKey, savedTitleId]);
  const displayedTitle = equippedV2Title ?? (equippedTitle ? localizeTitle(equippedTitle, language) : null);

  const achievements = livePresentation.v2?.achievements;
  const titles = livePresentation.v2?.titles;
  const unlockedAchievements = (achievements ?? character.achievements).filter((a) => a.unlocked).length;
  const unlockedTitles = (titles ?? character.titles).filter((title) => title.unlocked).length;
  const renderMode = resolveCharacterRenderMode(livePresentation, livePresentation.pollStatus);
  const isWaitingForV2 = renderMode === "loading";
  const usesV1Fallback = renderMode === "v1-fallback";
  const calculatedNumbersPublishable = character.calculationCoverage.sharing.calculatedNumbersPublishable;

  useEffect(() => {
    if (!isWaitingForV2) stageRef.current?.setAttribute("data-character-page-ready", "true");
  }, [isWaitingForV2]);

  if (isWaitingForV2) return <CharacterForgeLoading language={language} />;

  return (
    <div ref={stageRef} className="pf-stage w-full flex-1" data-character-page-ready="false">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8 ${livePresentation.v2 ? "motion-safe:animate-[fade-rise_220ms_ease-out_both] motion-reduce:animate-none" : "animate-fade-in"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-sans font-semibold text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold px-2 py-1 -ml-2 rounded"
          >
            <PixelArrowLeft className="w-4 h-4" />
            <span>{t.common.backToSearch}</span>
          </Link>
        </div>

        <CharacterHeader
          character={character}
          equippedTitle={displayedTitle}
          v2={livePresentation.v2}
          onOpenShareModal={SHARE_ACTIONS_ENABLED && calculatedNumbersPublishable ? () => setIsShareModalOpen(true) : undefined}
          onOpenHeroShare={calculatedNumbersPublishable ? () => setIsHeroShareOpen(true) : undefined}
          onOpenClassExplanation={() => setIsClassExplanationOpen(true)}
          onOpenReadmeModal={SHARE_ACTIONS_ENABLED && calculatedNumbersPublishable ? () => setIsReadmeModalOpen(true) : undefined}
        />

        {character.calculationCoverage.status !== "complete" && (
          <div role="status" aria-live="polite" className="border-l-4 border-amber-500 bg-amber-950/25 px-4 py-4 text-slate-200">
            <p className="font-pixel text-xs leading-relaxed text-amber-200">{t.character.partialSheetTitle}</p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-slate-300">{t.character.partialSheetDescription}</p>
          </div>
        )}

        <CharacterTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unlockedAchievementsCount={unlockedAchievements}
          totalAchievementsCount={achievements?.length ?? character.achievements.length}
          unlockedTitlesCount={unlockedTitles}
          totalTitlesCount={titles?.length ?? character.titles.length}
        />

        {usesV1Fallback && (
          <div className="border-l-2 border-rpg-goldDark/70 bg-black/25 px-4 py-3 text-center font-sans text-xs text-slate-400" role="status">
            <span>{t.gameV2.fallback}</span>
            {(livePresentation.pollStatus === "rate_limited" || livePresentation.pollStatus === "timed_out" || livePresentation.pollStatus === "failed") && (
              <button type="button" onClick={livePresentation.retry} className="ml-2 rounded underline underline-offset-2 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold">{t.gameV2.retry}</button>
            )}
          </div>
        )}

        <TabPanel idPrefix={CHARACTER_TABS_ID_PREFIX} tabId={activeTab} className="min-h-[400px] pt-4">
          {activeTab === "overview" && (
            <div className="space-y-14 animate-fade-in sm:space-y-16">
              {hasSparsePublicData(character) && (
                <p
                  role="note"
                  className="font-sans text-sm text-slate-300 border-l-4 border-rpg-goldDark bg-black/30 px-4 py-3"
                >
                  {t.character.sparseProfileNotice}
                </p>
              )}
              <NextMilestones milestones={character.nextMilestones} />
              <ChronicleSection
                chronicle={chronicle}
                onShareChapter={calculatedNumbersPublishable ? ({ year, title }) => setShareTarget({ kind: "chronicle", year, title }) : undefined}
              />
              {activityFlame && <ActivityFlameSection model={activityFlame} />}
              <AttributesPanel stats={character.stats} coverage={character.calculationCoverage.attributes} />
              {livePresentation.v2 && (
                <GrimoireSection
                  v2={livePresentation.v2}
                  partial={livePresentation.delivery === "partial" || livePresentation.v2.coverage.schools === "partial" || livePresentation.v2.coverage.artifacts === "partial"}
                />
              )}
              <ActivitySummary summary={character.summary} />
            </div>
          )}

          {activeTab === "skills" && (
            <div className="animate-fade-in">
              <SkillsTree skills={character.skills} />
            </div>
          )}

          {activeTab === "achievements" && (
            <div className="animate-fade-in">
              {achievements ? <AchievementsGridV2
                achievements={achievements}
                legacyAchievements={character.achievements}
                onShareAchievement={calculatedNumbersPublishable ? (achievement: PublicAchievementV2Localized) => {
                  const v1 = character.achievements.find((candidate) => candidate.id === achievement.id && candidate.unlocked);
                  if (v1) setShareTarget({ kind: "achievement", id: v1.id, name: v1.name });
                } : undefined}
              /> : <AchievementsGrid
                achievements={character.achievements}
                onShareAchievement={calculatedNumbersPublishable ? ({ id, name }) => setShareTarget({ kind: "achievement", id, name }) : undefined}
              />}
            </div>
          )}

          {activeTab === "titles" && (
            <div className="animate-fade-in">
              {titles ? <TitlesPanelV2
                titles={titles}
                equippedTitleId={equippedV2Title?.id ?? null}
                defaultTitleId={livePresentation.v2?.defaultTitleId ?? null}
                hasCustomPick={savedTitleId !== undefined && savedTitleId === equippedV2Title?.id}
                onEquip={(titleId) => equipTitle(character.identity.username, titleId)}
                onUseDefault={() => clearEquippedTitle(character.identity.username)}
              /> : <TitlesPanel
                titles={character.titles}
                equippedTitleId={equippedTitle?.id ?? null}
                defaultTitleId={character.defaultTitleId}
                hasCustomPick={savedTitleId !== undefined && savedTitleId === equippedTitle?.id}
                onEquip={(titleId) => equipTitle(character.identity.username, titleId)}
                onUseDefault={() => clearEquippedTitle(character.identity.username)}
              />}
            </div>
          )}
        </TabPanel>

        <p className="font-sans text-xs text-slate-500 text-center max-w-3xl mx-auto">{t.disclaimer}</p>

        <ClassExplanationDialog
          isOpen={isClassExplanationOpen}
          onClose={() => setIsClassExplanationOpen(false)}
          explanation={classExplanation}
          v2Explanation={livePresentation.v2?.explanation}
        />

        <ReadmeBadgeModal isOpen={isReadmeModalOpen} onClose={() => setIsReadmeModalOpen(false)} username={username} />

        {shareTarget && (
          <ShareImageModal isOpen onClose={() => setShareTarget(null)} username={username} target={shareTarget} />
        )}

        <HeroShareDialog
          isOpen={isHeroShareOpen}
          onClose={() => setIsHeroShareOpen(false)}
          username={username}
          heroClassName={resolveHeroIdentity(character, livePresentation.v2, language).className}
          level={character.calculationCoverage.xpLevel === "complete" ? character.progression.level : null}
          title={displayedTitle?.name ?? null}
          titleId={equippedV2Title?.id ?? equippedTitle?.id}
        />

        {isShareModalOpen && (
          <ShareCardModal
            isOpen
            onClose={() => setIsShareModalOpen(false)}
            character={character}
            equippedTitleName={equippedTitle?.name ?? null}
          />
        )}
      </div>
    </div>
  );
}
