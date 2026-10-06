"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getAvatarFrameForUsername } from "./avatarFrames";

/**
 * How much of the slot the avatar takes. Every frame is scaled so that ITS window matches this,
 * which keeps the avatar the same size for every hero; the frame may bleed a little past the slot.
 */
export const AVATAR_SLOT_RATIO = 0.6;
const AVATAR_INSET_PERCENT = ((1 - AVATAR_SLOT_RATIO) / 2) * 100;

interface FramedAvatarProps {
  /** Picks the frame (deterministically). Without it the default frame is used. */
  username?: string;
  /** GitHub photo. Without it (or if it fails to load) `fallback` is shown. */
  avatarUrl?: string;
  /** Accessible description of the photo; "" marks it as decorative (the name is shown next to it). */
  alt: string;
  /** Shown instead of the photo: initials, a procedural avatar, ... */
  fallback?: React.ReactNode;
  /** Size of the slot, e.g. "h-24 w-24 sm:h-32 sm:w-32". Ignored when `size` is set. */
  className?: string;
  /** Slot size in px, for callers that compute it. */
  size?: number;
  /** Extra classes for the box that holds the photo (borders, rarity glow, ...). */
  contentClassName?: string;
  /** Preload the photo and frame when this avatar is visible above the fold. */
  priority?: boolean;
}

/** The one place where a hero's avatar meets its frame; everything is sized in percent of the slot. */
export const FramedAvatar: React.FC<FramedAvatarProps> = ({
  username,
  avatarUrl,
  alt,
  fallback = null,
  className = "",
  size,
  contentClassName = "",
  priority = false,
}) => {
  const frame = getAvatarFrameForUsername(username);
  // Remember which URL failed so a new avatarUrl is tried again without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && avatarUrl !== failedUrl;

  const frameScale = AVATAR_SLOT_RATIO / frame.avatarRatio;
  const frameOffset = `${((1 - frameScale) / 2) * 100}%`;
  const frameSize = `${frameScale * 100}%`;

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={size === undefined ? undefined : { width: size, height: size }}
      data-avatar-frame={frame.id}
    >
      <div
        className={`absolute flex items-center justify-center overflow-hidden bg-rpg-void ${contentClassName}`}
        style={{ inset: `${AVATAR_INSET_PERCENT}%` }}
      >
        {showPhoto && avatarUrl ? (
          // External GitHub avatar: served as-is (no optimizer, no remote domain config).
          <Image
            src={avatarUrl}
            alt={alt}
            width={256}
            height={256}
            unoptimized
            priority={priority}
            referrerPolicy="no-referrer"
            // A load can fail before React hydrates, in which case onError never fires.
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailedUrl(avatarUrl);
            }}
            onError={() => setFailedUrl(avatarUrl)}
            className="h-full w-full object-cover"
          />
        ) : (
          fallback
        )}
      </div>
      {/* Decorative: the avatar and the hero's name carry the information. */}
      <Image
        src={frame.src}
        alt=""
        aria-hidden
        width={512}
        height={512}
        unoptimized
        priority={priority}
        className="pointer-events-none absolute max-w-none"
        style={{ width: frameSize, height: frameSize, left: frameOffset, top: frameOffset }}
      />
    </div>
  );
};
