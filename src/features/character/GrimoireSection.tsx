"use client";

import React from "react";
import { LanguageIcon } from "@/design-system";
import type { RPGCharacterV2Public } from "@/game-v2/publicProjection";
import { ProfileMeter, ProfileSectionHeader } from "@/features/profile-ui";
import { getTranslation } from "@/i18n";
import { formatNumber, pluralize, fill } from "@/lib/format";
import { useUiStore } from "@/stores/useUiStore";

function affinityLabel(score: number | null, labels: ReturnType<typeof getTranslation>["gameV2"]["affinityLevels"]): string {
  if (score === null) return labels.unavailable;
  if (score >= 85) return labels.emblematic;
  if (score >= 70) return labels.dominant;
  if (score >= 45) return labels.strong;
  if (score >= 25) return labels.familiar;
  return labels.trace;
}

export function GrimoireSection({ v2, partial }: { v2: RPGCharacterV2Public; partial: boolean }) {
  const { language } = useUiStore();
  const t = getTranslation(language).gameV2;

  return (
    <section aria-labelledby="hero-grimoire-title" className="space-y-6">
      <ProfileSectionHeader
        id="hero-grimoire-title"
        title={t.grimoireTitle}
        subtitle={t.grimoireSubtitle}
      />
      {partial && (
        <p role="note" className="border-l-4 border-amber-700 bg-amber-950/25 px-4 py-3 text-sm text-amber-100 font-sans shadow-sm">
          {t.partial}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Affinities Column */}
        <section aria-labelledby="grimoire-affinities" className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-[#4a3822]/50">
            <span className="text-amber-400 text-xs" aria-hidden="true">✦</span>
            <h3 id="grimoire-affinities" className="font-pixel text-xs uppercase tracking-wider text-amber-300">
              {t.affinities}
            </h3>
          </div>
          <div className="space-y-3">
            {v2.grimoire.affinities.map((affinity) => (
              <div key={affinity.name} className="pf-grimoire-card">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="inline-flex min-w-0 items-center gap-2 font-sans text-sm font-bold text-slate-100">
                    <span className="inline-flex p-1 rounded bg-black/40 border border-[#4a3822]/60 shrink-0">
                      <LanguageIcon language={affinity.name} className="h-4 w-4" />
                    </span>
                    <span className="truncate">{affinity.name}</span>
                  </span>
                  <span className="pf-seal pf-seal--default shrink-0">
                    {t.level} {affinity.skillLevel}
                  </span>
                </div>
                <ProfileMeter
                  value={affinity.sharePercent}
                  max={100}
                  tone="arcane"
                  size="sm"
                  aria-label={`${affinity.name} ${formatNumber(affinity.sharePercent, language)}%`}
                />
                <div className="flex items-center justify-between font-mono text-xs text-slate-400 pt-0.5">
                  <span className="text-amber-200 font-bold">
                    {formatNumber(affinity.sharePercent, language)}%
                  </span>
                  <span>
                    {fill(pluralize(affinity.repoCount, t.repositories), { n: affinity.repoCount })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Schools & Artifacts Columns */}
        {(["schools", "artifacts"] as const).map((kind) => {
          const items = v2.grimoire[kind];
          const title = kind === "schools" ? t.schools : t.artifacts;
          const isSchool = kind === "schools";
          return (
            <section key={kind} aria-labelledby={`grimoire-${kind}`} className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-[#4a3822]/50">
                <span className={isSchool ? "text-sky-400 text-xs" : "text-purple-400 text-xs"} aria-hidden="true">
                  {isSchool ? "❖" : "⚙"}
                </span>
                <h3 id={`grimoire-${kind}`} className="font-pixel text-xs uppercase tracking-wider text-amber-300">
                  {title}
                </h3>
              </div>
              {items.length === 0 ? (
                <div className="pf-grimoire-card text-center py-6 text-sm text-slate-400 italic">
                  {isSchool ? t.noSchools : t.noArtifacts}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="pf-grimoire-card flex-row items-center justify-between gap-3">
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs shrink-0 ${isSchool ? "text-sky-400/80" : "text-purple-400/80"}`}
                            aria-hidden="true"
                          >
                            {isSchool ? "◆" : "✦"}
                          </span>
                          <p className="truncate font-sans text-sm font-bold text-slate-100">{item.name}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 pl-3.5">
                          {fill(pluralize(item.repositoryCount, t.repositories), { n: item.repositoryCount })}
                        </p>
                      </div>

                      <div
                        className={`pf-mastery-plate ${isSchool ? "pf-mastery-plate--school" : "pf-mastery-plate--artifact"} shrink-0`}
                        title={affinityLabel(item.score, t.affinityLevels)}
                      >
                        <span
                          className={`font-mono text-xs font-bold ${isSchool ? "text-sky-200" : "text-purple-200"}`}
                          aria-label={`${affinityLabel(item.score, t.affinityLevels)} ${item.score ?? "—"}`}
                        >
                          {item.score === null ? "—" : Math.round(item.score)}
                        </span>
                        <span
                          className={`text-[9px] font-sans font-bold uppercase tracking-wider leading-none mt-0.5 ${
                            isSchool ? "text-sky-400/80" : "text-purple-400/80"
                          }`}
                        >
                          {affinityLabel(item.score, t.affinityLevels)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
