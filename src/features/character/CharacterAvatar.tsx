import React, { useState } from "react";
import Image from "next/image";
import { renderProceduralAvatarSvg } from "./avatar/proceduralAvatar";

/** The transparent window of /molduradourada.png is ~56% of the image width; the photo is slightly larger so it tucks under the frame edge. */
const FRAME_WINDOW_RATIO = 0.6;

interface CharacterAvatarProps {
  seed: number;
  /** Real GitHub photo. Without it (or if it fails to load) the procedural avatar is shown. */
  photoUrl?: string;
  /** Accessible description of the photo. */
  photoAlt?: string;
  size?: number;
  className?: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  seed,
  photoUrl,
  photoAlt = "",
  size = 112,
  className = "",
  rarity = "common",
}) => {
  // Remember which URL failed so a new photoUrl is tried again without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(photoUrl) && photoUrl !== failedUrl;
  const svgMarkup = showPhoto ? "" : renderProceduralAvatarSvg(seed, size);

  const rarityBorders: Record<string, string> = {
    common: "border-slate-500 shadow-pixel",
    rare: "border-sky-400 shadow-pixel-azure",
    epic: "border-purple-400 shadow-pixel-arcane",
    legendary: "border-amber-400 shadow-pixel-gold",
  };

  const frameSize = Math.round(size / FRAME_WINDOW_RATIO);

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: frameSize, height: frameSize }}
    >
      {/* Photo/avatar sits under the frame; the frame's gems overlap its edges */}
      {showPhoto && photoUrl ? (
        <div
          className={`flex items-center justify-center overflow-hidden bg-rpg-void border-2 ${rarityBorders[rarity]}`}
          style={{ width: size, height: size }}
        >
          {/* External GitHub avatar: served as-is (no optimizer, no remote domain config). */}
          <Image
            src={photoUrl}
            alt={photoAlt}
            width={size}
            height={size}
            unoptimized
            referrerPolicy="no-referrer"
            // A load can fail before React hydrates, in which case onError never fires.
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailedUrl(photoUrl);
            }}
            onError={() => setFailedUrl(photoUrl)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center overflow-hidden bg-rpg-void border-2 pixelated ${rarityBorders[rarity]}`}
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      )}
      <Image
        src="/molduradourada.png"
        alt=""
        aria-hidden
        width={frameSize}
        height={frameSize}
        sizes={`${frameSize}px`}
        className="pointer-events-none absolute inset-0 w-full h-full pixelated"
      />
    </div>
  );
};
