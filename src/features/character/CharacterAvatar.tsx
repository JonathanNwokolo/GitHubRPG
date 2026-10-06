import React from "react";
import { AVATAR_SLOT_RATIO, FramedAvatar } from "@/features/avatar";
import { renderProceduralAvatarSvg } from "./avatar/proceduralAvatar";

interface CharacterAvatarProps {
  seed: number;
  /** Real GitHub photo. Without it (or if it fails to load) the procedural avatar is shown. */
  photoUrl?: string;
  /** Accessible description of the photo. */
  photoAlt?: string;
  /** Username that picks the frame; the same hero gets the same frame everywhere. */
  username?: string;
  /** Size of the avatar itself; the frame around it is larger. */
  size?: number;
  className?: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

const rarityBorders: Record<string, string> = {
  common: "border-slate-500 shadow-pixel",
  rare: "border-sky-400 shadow-pixel-azure",
  epic: "border-purple-400 shadow-pixel-arcane",
  legendary: "border-amber-400 shadow-pixel-gold",
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  seed,
  photoUrl,
  photoAlt = "",
  username,
  size = 112,
  className = "",
  rarity = "common",
}) => (
  <FramedAvatar
    username={username}
    avatarUrl={photoUrl}
    alt={photoAlt}
    size={Math.round(size / AVATAR_SLOT_RATIO)}
    className={className}
    contentClassName={`border-2 ${rarityBorders[rarity]}`}
    priority
    fallback={
      <div
        className="pixelated h-full w-full [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: renderProceduralAvatarSvg(seed, size) }}
      />
    }
  />
);
