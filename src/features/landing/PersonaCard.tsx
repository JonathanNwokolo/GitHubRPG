"use client";

import React from "react";
import {
  Card,
  Badge,
  PixelUsers,
  PixelShield,
  PixelStar,
  PixelLayers,
  PixelGhost,
  PixelAlert,
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

const ICONS: Record<PersonaIcon, React.ReactNode> = {
  rookie: <PixelUsers className="w-5 h-5 text-sky-400" />,
  veteran: <PixelShield className="w-5 h-5 text-amber-400" />,
  polyglot: <PixelLayers className="w-5 h-5 text-cyan-400" />,
  popular: <PixelStar className="w-5 h-5 text-yellow-300" />,
  empty: <PixelGhost className="w-5 h-5 text-slate-400" />,
  missing: <PixelAlert className="w-5 h-5 text-red-400" />,
};

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, actionLabel, onSelect }) => {
  return (
    <Card
      variant="interactive"
      onClick={() => onSelect(persona.id)}
      className="flex flex-col justify-between p-5 group hover:border-rpg-gold hover:shadow-pixel-gold transition-all text-left bg-rpg-surface/80 hover:bg-rpg-surface border-2 min-h-[220px]"
    >
      <div className="space-y-3">
        {/* Top Icon & Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="p-2.5 bg-rpg-obsidian border border-rpg-border flex items-center justify-center group-hover:scale-110 transition-transform">
            {ICONS[persona.icon]}
          </div>
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
        <span className="group-hover:translate-x-1.5 transition-transform text-sm">&rarr;</span>
      </div>
    </Card>
  );
};
