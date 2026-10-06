"use client";

import React, { useState } from "react";
import type { Skill, SkillTier } from "@/game/types";
import {
  Badge,
  BadgeVariant,
  Card,
  Dialog,
  EmptyState,
  ProgressBar,
  PixelCode,
} from "@/design-system";
import { fill, formatNumber } from "@/lib/format";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface SkillsTreeProps {
  skills: Skill[];
}

const TIER_BADGE: Record<SkillTier, BadgeVariant> = {
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
      <div className="flex flex-col gap-2 border-b border-rpg-border pb-4">
        <h2 className="font-pixel text-sm sm:text-base text-rpg-gold uppercase tracking-wider">
          {t.skills.title}
        </h2>
        <p className="font-sans text-xs sm:text-sm text-slate-300 max-w-3xl">{t.skills.subtitle}</p>
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
              className="w-full text-left p-4 border-2 bg-rpg-surface border-rpg-borderLight hover:border-rpg-gold hover:shadow-pixel-gold transition-all space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 border bg-rpg-obsidian border-rpg-goldDark flex-shrink-0">
                    <PixelCode className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="font-sans font-bold text-sm text-slate-100">{skill.name}</span>
                </div>
                <Badge variant={TIER_BADGE[skill.tier]} size="sm">
                  {skill.tier}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-300">
                    {t.skills.level} {skill.level}
                  </span>
                  <span className="text-amber-400 font-bold">{skill.level} / {SKILL_MAX_LEVEL}</span>
                </div>
                <ProgressBar
                  value={skill.level}
                  max={SKILL_MAX_LEVEL}
                  variant="arcane"
                  showValueText={false}
                  size="sm"
                  aria-label={`${skill.name} ${t.skills.level} ${skill.level}`}
                />
              </div>

              <p className="font-sans text-xs text-slate-400">
                {t.skills.share}: {formatNumber(skill.sharePercent, language)}% &bull; {t.skills.repos}: {skill.repoCount}
              </p>
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
        description={selected ? `${t.skills.level} ${selected.level} • ${selected.tier}` : undefined}
      >
        {selected && (
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={TIER_BADGE[selected.tier]}>{selected.tier}</Badge>
              <span className="font-mono text-sm font-bold text-amber-400">
                {selected.level} / {SKILL_MAX_LEVEL}
              </span>
            </div>
            <ProgressBar
              value={selected.level}
              max={SKILL_MAX_LEVEL}
              variant="arcane"
              showValueText={false}
              aria-label={`${selected.name} ${t.skills.level} ${selected.level}`}
            />
            <ul className="font-sans text-sm text-slate-200 space-y-1 list-disc list-inside">
              <li>{fill(t.skills.detailShare, { n: formatNumber(selected.sharePercent, language) })}</li>
              <li>{fill(t.skills.detailRepos, { n: selected.repoCount })}</li>
            </ul>
            <p className="font-sans text-xs text-slate-400">{t.skills.affinityNote}</p>
          </Card>
        )}
      </Dialog>
    </div>
  );
};
