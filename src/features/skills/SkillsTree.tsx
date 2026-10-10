"use client";

import React, { useState } from "react";
import type { Skill, SkillTier } from "@/game/types";
import {
  Dialog,
  EmptyState,
  RpgIconFrame,
  LanguageIcon,
  IconRarity,
} from "@/design-system";
import { ProfileMeter, ProfileSectionHeader } from "@/features/profile-ui";
import { fill, formatNumber, pluralize } from "@/lib/format";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { localizeSkillTier } from "@/i18n/gameContent";

interface SkillsTreeProps {
  skills: Skill[];
}

const TIER_SEAL: Record<SkillTier, string> = {
  Aprendiz: "common",
  Adepto: "rare",
  Especialista: "rare",
  Mestre: "epic",
  Arquimestre: "mythic",
  Lendário: "legendary",
};

const TIER_RARITY: Record<SkillTier, IconRarity> = {
  Aprendiz: "common",
  Adepto: "azure",
  Especialista: "rare",
  Mestre: "epic",
  Arquimestre: "arcane",
  Lendário: "legendary",
};

/** Max level of a skill, only used to draw the bar; the level itself comes from the engine. */
const SKILL_MAX_LEVEL = 20;

export const SkillsTree: React.FC<SkillsTreeProps> = ({ skills }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const [selected, setSelected] = useState<Skill | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ProfileSectionHeader variant="quiet" title={t.skills.title} subtitle={t.skills.subtitle} />
        {skills.length > 0 && (
          <p className="font-mono text-xs text-slate-400 max-w-md">{t.skills.keyboardHint}</p>
        )}
      </div>

      {skills.length === 0 ? (
        <EmptyState title={t.skills.empty} message={t.skills.emptyHint} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => setSelected(skill)}
              className="pf-skill-card group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <RpgIconFrame
                      size="sm"
                      shape="slate"
                      rarity={TIER_RARITY[skill.tier] ?? "common"}
                      glow
                    >
                      <LanguageIcon language={skill.name} />
                    </RpgIconFrame>
                    <span className="font-sans font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                      {skill.name}
                    </span>
                  </div>
                  <span className={`pf-seal pf-seal--rarity-${TIER_SEAL[skill.tier]}`}>
                    {localizeSkillTier(skill.tier, language)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-300 font-medium">
                      {t.skills.level} {skill.level}
                    </span>
                    <span className="text-amber-400 font-bold">{skill.level} / {SKILL_MAX_LEVEL}</span>
                  </div>
                  <ProfileMeter
                    value={skill.level}
                    max={SKILL_MAX_LEVEL}
                    tone="arcane"
                    size="sm"
                    aria-label={`${skill.name} ${t.skills.level} ${skill.level}`}
                  />
                </div>
              </div>

              <div className="pt-2 mt-auto border-t border-[#4a3822]/60">
                <p className="font-sans text-xs text-slate-300/80">
                  {t.skills.share}: {formatNumber(skill.sharePercent, language)}% &bull; {t.skills.repos}: {skill.repoCount}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="font-sans text-xs text-slate-400 max-w-3xl">{t.skills.affinityNote}</p>

      {/* Skill detail */}
      <Dialog
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description={selected ? `${t.skills.level} ${selected.level} • ${localizeSkillTier(selected.tier, language)}` : undefined}
        closeLabel={t.common.closeDialog}
      >
        {selected && (
          <div className="pf-skill-card p-5 space-y-3.5 cursor-default">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <RpgIconFrame
                  size="sm"
                  shape="slate"
                  rarity={TIER_RARITY[selected.tier] ?? "common"}
                  glow
                >
                  <LanguageIcon language={selected.name} />
                </RpgIconFrame>
                <span className={`pf-seal pf-seal--rarity-${TIER_SEAL[selected.tier]}`}>
                  {localizeSkillTier(selected.tier, language)}
                </span>
              </div>
              <span className="font-mono text-sm font-bold text-amber-400">
                {selected.level} / {SKILL_MAX_LEVEL}
              </span>
            </div>
            <ProfileMeter
              value={selected.level}
              max={SKILL_MAX_LEVEL}
              tone="arcane"
              size="md"
              aria-label={`${selected.name} ${t.skills.level} ${selected.level}`}
            />
            <ul className="font-sans text-sm text-slate-200 space-y-1.5 list-disc list-inside pt-1">
              <li>{fill(t.skills.detailShare, { n: formatNumber(selected.sharePercent, language) })}</li>
              <li>{fill(pluralize(selected.repoCount, t.skills.detailRepos), { n: selected.repoCount })}</li>
            </ul>
            <p className="font-sans text-xs text-slate-400 italic pt-1 border-t border-[#4a3822]/40">
              {t.skills.affinityNote}
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
};
