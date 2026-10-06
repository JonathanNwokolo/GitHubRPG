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
import { useUiStore } from "@/stores/useUiStore";
import { useTitleStore } from "@/stores/useTitleStore";
import { getTranslation } from "@/i18n";

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
}

export default function CharacterPage({ character, chronicle, classExplanation, username }: CharacterPageProps) {
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

  const unlockedAchievements = character.achievements.filter((a) => a.unlocked).length;
  const unlockedTitles = character.titles.filter((title) => title.unlocked).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8 animate-fade-in">
      <div>
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
        equippedTitle={equippedTitle}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenClassExplanation={() => setIsClassExplanationOpen(true)}
        onOpenReadmeModal={() => setIsReadmeModalOpen(true)}
      />

      <CharacterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unlockedAchievementsCount={unlockedAchievements}
        totalAchievementsCount={character.achievements.length}
        unlockedTitlesCount={unlockedTitles}
        totalTitlesCount={character.titles.length}
      />

      <TabPanel idPrefix={CHARACTER_TABS_ID_PREFIX} tabId={activeTab} className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            {hasSparsePublicData(character) && (
              <p
                role="note"
                className="font-sans text-sm text-slate-300 border-l-4 border-rpg-goldDark bg-rpg-surface px-4 py-3"
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
            <AchievementsGrid
              achievements={character.achievements}
              onShareAchievement={({ id, name }) => setShareTarget({ kind: "achievement", id, name })}
            />
          </div>
        )}

        {activeTab === "titles" && (
          <div className="animate-fade-in">
            <TitlesPanel
              titles={character.titles}
              equippedTitleId={equippedTitle?.id ?? null}
              defaultTitleId={character.defaultTitleId}
              hasCustomPick={savedTitleId !== undefined && savedTitleId === equippedTitle?.id}
              onEquip={(titleId) => equipTitle(character.identity.username, titleId)}
              onUseDefault={() => clearEquippedTitle(character.identity.username)}
            />
          </div>
        )}
      </TabPanel>

      <p className="font-sans text-xs text-slate-500 text-center max-w-3xl mx-auto">{t.disclaimer}</p>

      <ClassExplanationDialog
        isOpen={isClassExplanationOpen}
        onClose={() => setIsClassExplanationOpen(false)}
        explanation={classExplanation}
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
  );
}
