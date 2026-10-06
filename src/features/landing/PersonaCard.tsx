"use client";

import React from "react";
import {
  Badge,
  RpgIconFrame,
  RpgUsers,
  RpgShield,
  RpgStar,
  RpgLayers,
  RpgGhost,
  RpgAlert,
  type IconRarity,
} from "@/design-system";

export type PersonaIcon = "rookie" | "veteran" | "polyglot" | "popular" | "empty" | "missing";

export interface PersonaItem {
  id: string;
  name: string;
  role: string;
  description: string;
  badge: string;
  badgeVariant: "common" | "rare" | "epic" | "legendary" | "crimson";
  icon: PersonaIcon;
}

interface PersonaCardProps {
  persona: PersonaItem;
  actionLabel: string;
  onSelect: (username: string) => void;
}

const ICONS: Record<PersonaIcon, { icon: React.ReactNode; rarity: IconRarity }> = {
  rookie: { icon: <RpgUsers className="w-5 h-5 text-sky-400" />, rarity: "rare" },
  veteran: { icon: <RpgShield className="w-5 h-5 text-amber-400" />, rarity: "legendary" },
  polyglot: { icon: <RpgLayers className="w-5 h-5 text-cyan-400" />, rarity: "azure" },
  popular: { icon: <RpgStar className="w-5 h-5 text-yellow-300" />, rarity: "gold" },
  empty: { icon: <RpgGhost className="w-5 h-5 text-purple-300" />, rarity: "common" },
  missing: { icon: <RpgAlert className="w-5 h-5 text-red-400" />, rarity: "crimson" },
};

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, actionLabel, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(persona.id)}
      className="group relative flex min-h-[220px] w-full flex-col justify-between border-2 border-rpg-border bg-rpg-surface/80 p-5 text-left text-rpg-parchment shadow-pixel transition-all duration-200 hover:-translate-y-1 hover:border-rpg-gold hover:bg-rpg-surface hover:shadow-pixel-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void"
    >
      <span className="absolute -top-[3px] -left-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" aria-hidden="true" />
      <span className="absolute -top-[3px] -right-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" aria-hidden="true" />
      <span className="absolute -bottom-[3px] -left-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" aria-hidden="true" />
      <span className="absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" aria-hidden="true" />
      <div className="space-y-3">
        {/* Top Icon & Badge */}
        <div className="flex items-center justify-between gap-2">
          <RpgIconFrame
            size="lg"
            shape="slate"
            rarity={ICONS[persona.icon].rarity}
            interactive
            glow
          >
            {ICONS[persona.icon].icon}
          </RpgIconFrame>
          <Badge variant={persona.badgeVariant} size="sm">
            {persona.badge}
          </Badge>
        </div>

        {/* Identity */}
        <div>
          <h3 className="font-sans font-bold text-base text-slate-100 group-hover:text-rpg-gold transition-colors tracking-tight">
            {persona.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-sans text-xs text-amber-300 font-semibold">{persona.role}</span>
            <span className="text-slate-500 text-xs">&bull;</span>
            <span className="font-mono text-xs text-slate-400">@{persona.id}</span>
          </div>
        </div>

        {/* Description with high contrast */}
        <p className="font-sans text-xs text-slate-300 leading-relaxed line-clamp-3">
          {persona.description}
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-rpg-border/60 flex items-center justify-between text-xs font-sans font-bold text-rpg-gold uppercase tracking-wider">
        <span>{actionLabel}</span>
        <span className="text-sm" aria-hidden="true">&rarr;</span>
      </div>
    </button>
  );
};
