"use client";

import React, { useMemo, useState } from "react";
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
import { ShareImageModal } from "@/features/share/ShareImageModal";
import type { ShareTarget } from "@/features/share/shareTarget";
import { TitlesPanel } from "@/features/titles/TitlesPanel";
import { resolveEquippedTitle } from "@/features/titles/equippedTitle";
import { ChronicleSection } from "@/features/chronicle/ChronicleSection";
import type { DeveloperChronicle } from "@/features/chronicle/types";
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

// The share modal (canvas drawing code) is only needed once someone opens it: keep it out of the initial bundle.
const ShareCardModal = dynamic(() => import("@/features/share/ShareCardModal").then((mod) => mod.ShareCardModal), {
  ssr: false,
  loading: () => null,
});

interface CharacterPageProps {
  character: RPGCharacter;
  chronicle: DeveloperChronicle;
  classExplanation: ClassExplanation;
  username: string;
  presentation?: CharacterPresentationModel;
}

export default function CharacterPage({
  character,
  chronicle,
  classExplanation,
  username,
  presentation = { v2Enabled: false, delivery: "unavailable", v2: null },
}: CharacterPageProps) {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const savedTitleId = useTitleStore((state) => state.equippedByUser[username]);
  const equipTitle = useTitleStore((state) => state.equipTitle);
  const clearEquippedTitle = useTitleStore((state) => state.clearEquippedTitle);

  const [activeTab, setActiveTab] = useState<CharacterActiveTab>("overview");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isClassExplanationOpen, setIsClassExplanationOpen] = useState(false);
  const [isReadmeModalOpen, setIsReadmeModalOpen] = useState(false);
  /** The achievement or chapter whose card is open, if any. */
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const equippedTitle = useMemo(
    () => resolveEquippedTitle(character.titles, savedTitleId, character.defaultTitleId),
    [character, savedTitleId]
  );
  const localizedKey = language === "pt-BR" ? "pt" : "en";
  const equippedV2Title = useMemo(() => {
    if (!presentation.v2) return null;
    const title = resolvePublicEquippedTitle(presentation.v2.titles, savedTitleId, presentation.v2.defaultTitleId);
    return title ? { id: title.id, name: title.name[localizedKey] } : null;
  }, [localizedKey, presentation.v2, savedTitleId]);
  const displayedTitle = equippedV2Title ?? equippedTitle;

  const achievements = presentation.v2?.achievements;
  const titles = presentation.v2?.titles;
  const unlockedAchievements = (achievements ?? character.achievements).filter((a) => a.unlocked).length;
  const unlockedTitles = (titles ?? character.titles).filter((title) => title.unlocked).length;

  return (
    <div className="pf-stage w-full flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8 animate-fade-in">
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
          v2={presentation.v2}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenClassExplanation={() => setIsClassExplanationOpen(true)}
          onOpenReadmeModal={() => setIsReadmeModalOpen(true)}
        />

        <CharacterTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unlockedAchievementsCount={unlockedAchievements}
          totalAchievementsCount={achievements?.length ?? character.achievements.length}
          unlockedTitlesCount={unlockedTitles}
          totalTitlesCount={titles?.length ?? character.titles.length}
        />

        {presentation.v2Enabled && presentation.delivery === "enriching" && (
          <p role="status" className="text-center font-sans text-xs text-slate-400">{t.gameV2.enriching}</p>
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
                onShareChapter={({ year, title }) => setShareTarget({ kind: "chronicle", year, title })}
              />
              <AttributesPanel stats={character.stats} />
              {presentation.v2 && (
                <GrimoireSection
                  v2={presentation.v2}
                  partial={presentation.delivery === "partial" || presentation.v2.coverage.schools === "partial" || presentation.v2.coverage.artifacts === "partial"}
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
                onShareAchievement={(achievement: PublicAchievementV2Localized) => {
                  const v1 = character.achievements.find((candidate) => candidate.id === achievement.id && candidate.unlocked);
                  if (v1) setShareTarget({ kind: "achievement", id: v1.id, name: v1.name });
                }}
              /> : <AchievementsGrid
                achievements={character.achievements}
                onShareAchievement={({ id, name }) => setShareTarget({ kind: "achievement", id, name })}
              />}
            </div>
          )}

          {activeTab === "titles" && (
            <div className="animate-fade-in">
              {titles ? <TitlesPanelV2
                titles={titles}
                equippedTitleId={equippedV2Title?.id ?? null}
                defaultTitleId={presentation.v2?.defaultTitleId ?? null}
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
          v2Explanation={presentation.v2?.explanation}
        />

        <ReadmeBadgeModal isOpen={isReadmeModalOpen} onClose={() => setIsReadmeModalOpen(false)} username={username} />

        {shareTarget && (
          <ShareImageModal isOpen onClose={() => setShareTarget(null)} username={username} target={shareTarget} />
        )}

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
