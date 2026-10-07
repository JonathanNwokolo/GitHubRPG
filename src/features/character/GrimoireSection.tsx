"use client";

import React from "react";
import { Badge, Card, LanguageIcon, ProgressBar, RpgIconFrame } from "@/design-system";
import type { RPGCharacterV2Public } from "@/game-v2/publicProjection";
import { ProfileSectionHeader } from "@/features/profile-ui";
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
      {partial && <p role="note" className="border-l-4 border-amber-700 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">{t.partial}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-labelledby="grimoire-affinities" className="space-y-3">
          <h3 id="grimoire-affinities" className="font-pixel text-xs uppercase tracking-wider text-amber-300">{t.affinities}</h3>
          <div className="space-y-3">
            {v2.grimoire.affinities.map((affinity) => (
              <Card key={affinity.name} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2 font-sans text-sm font-bold text-slate-100">
                    <LanguageIcon language={affinity.name} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{affinity.name}</span>
                  </span>
                  <Badge variant="azure" size="sm">{t.level} {affinity.skillLevel}</Badge>
                </div>
                <ProgressBar value={affinity.sharePercent} max={100} variant="arcane" showValueText={false} aria-label={`${affinity.name} ${formatNumber(affinity.sharePercent, language)}%`} />
                <p className="text-xs text-slate-400">{formatNumber(affinity.sharePercent, language)}% · {fill(pluralize(affinity.repoCount, t.repositories), { n: affinity.repoCount })}</p>
              </Card>
            ))}
          </div>
        </section>

        {(["schools", "artifacts"] as const).map((kind) => {
          const items = v2.grimoire[kind];
          const title = kind === "schools" ? t.schools : t.artifacts;
          return (
            <section key={kind} aria-labelledby={`grimoire-${kind}`} className="space-y-3">
              <h3 id={`grimoire-${kind}`} className="font-pixel text-xs uppercase tracking-wider text-amber-300">{title}</h3>
              {items.length === 0 ? (
                <p className="border border-rpg-border/60 bg-black/20 p-4 text-sm text-slate-400">
                  {kind === "schools" ? t.noSchools : t.noArtifacts}
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-bold text-slate-100">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{fill(pluralize(item.repositoryCount, t.repositories), { n: item.repositoryCount })}</p>
                      </div>
                      <RpgIconFrame size="sm" shape="slate" rarity={kind === "schools" ? "rare" : "arcane"} glow>
                        <span className="font-mono text-xs font-bold" aria-label={`${affinityLabel(item.score, t.affinityLevels)} ${item.score ?? "—"}`}>
                          {item.score === null ? "—" : Math.round(item.score)}
                        </span>
                      </RpgIconFrame>
                    </Card>
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
