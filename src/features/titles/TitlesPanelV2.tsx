"use client";

import React from "react";
import { Badge, Button, Card, RpgCheck, RpgIconFrame, RpgLock, RpgTrophy } from "@/design-system";
import type { PublicTitleV2Localized } from "@/game-v2/publicProjection";
import { ProfileSectionHeader } from "@/features/profile-ui";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

const badge = { common: "common", rare: "rare", epic: "epic", legendary: "legendary", mythic: "arcane" } as const;

export function TitlesPanelV2({ titles, equippedTitleId, defaultTitleId, hasCustomPick, onEquip, onUseDefault }: {
  titles: PublicTitleV2Localized[];
  equippedTitleId: string | null;
  defaultTitleId: string | null;
  hasCustomPick: boolean;
  onEquip: (id: string) => void;
  onUseDefault: () => void;
}) {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const text = language === "pt-BR" ? "pt" : "en";
  const unlocked = titles.filter((title) => title.unlocked);
  const locked = titles.filter((title) => !title.unlocked);
  return <div className="space-y-8">
    <ProfileSectionHeader variant="quiet" title={t.titles.title} subtitle={t.titles.subtitle} aside={hasCustomPick ? <Button size="sm" variant="ghost" onClick={onUseDefault}>{t.titles.useDefault}</Button> : undefined} />
    <section aria-labelledby="v2-titles-unlocked" className="space-y-3"><h3 id="v2-titles-unlocked" className="text-sm font-bold uppercase tracking-wider text-emerald-300">{t.titles.unlockedSection} ({unlocked.length})</h3><ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{unlocked.map((title) => { const equipped = title.id === equippedTitleId; return <li key={title.id}><Card className={`flex items-start justify-between gap-3 ${equipped ? "border-rpg-goldDark shadow-pixel-gold" : ""}`}><div className="space-y-1"><div className="flex items-center gap-2 text-sm font-bold text-slate-100"><RpgIconFrame size="xs" shape="circle" rarity={badge[title.rarity]} glow><RpgCheck className="h-3.5 w-3.5" /></RpgIconFrame><span>{title.name[text]}</span></div><p className="text-xs text-slate-300">{title.description[text]}</p><div className="flex gap-1.5 pt-1"><Badge variant={badge[title.rarity]} size="sm">{t.gameV2.rarities[title.rarity]}</Badge>{title.id === defaultTitleId && <Badge variant="azure" size="sm">{t.titles.defaultTag}</Badge>}</div></div>{equipped ? <Badge variant="gold" size="md" className="gap-1"><RpgTrophy className="h-3.5 w-3.5" />{t.titles.equipped}</Badge> : <Button size="sm" variant="secondary" onClick={() => onEquip(title.id)} aria-label={`${t.titles.equip}: ${title.name[text]}`}>{t.titles.equip}</Button>}</Card></li>; })}</ul></section>
    {locked.length > 0 && <section aria-labelledby="v2-titles-locked" className="space-y-3"><h3 id="v2-titles-locked" className="text-sm font-bold uppercase tracking-wider text-slate-400">{t.gameV2.lockedTitles} ({locked.length})</h3><ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{locked.map((title) => <li key={title.id}><Card className="flex items-start gap-3 opacity-80"><RpgIconFrame size="xs" shape="circle" rarity="common"><RpgLock className="h-3.5 w-3.5 text-slate-500" /></RpgIconFrame><div><p className="text-sm font-bold text-slate-200">{title.name[text]}</p><p className="mt-1 text-xs text-slate-400">{title.description[text]}</p></div></Card></li>)}</ul></section>}
  </div>;
}
