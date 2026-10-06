import React from "react";
import { renderProceduralAvatarSvg } from "./avatar/proceduralAvatar";

interface CharacterAvatarProps {
  seed: number;
  size?: number;
  className?: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  seed,
  size = 112,
  className = "",
  rarity = "common",
}) => {
  const svgMarkup = renderProceduralAvatarSvg(seed, size);

  const rarityBorders: Record<string, string> = {
    common: "border-slate-500 shadow-pixel",
    rare: "border-sky-400 shadow-pixel-azure",
    epic: "border-purple-400 shadow-pixel-arcane",
    legendary: "border-amber-400 shadow-pixel-gold",
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center p-1 bg-rpg-void border-2 ${
        rarityBorders[rarity]
      } ${className}`}
    >
      <div
        className="w-full h-full flex items-center justify-center pixelated"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      {/* Corner accents */}
      <span className="absolute -top-1 -left-1 w-2 h-2 bg-rpg-gold" />
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rpg-gold" />
      <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-rpg-gold" />
      <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-rpg-gold" />
    </div>
  );
};
