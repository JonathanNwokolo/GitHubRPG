"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { RPGCharacter } from "@/game/types";
import { useUiStore } from "@/stores/useUiStore";
import { CreatorCardBack } from "./CreatorCardBack";
import { CreatorCardFront } from "./CreatorCardFront";

export interface CreatorCardProps {
  character: RPGCharacter;
  isFlipped: boolean; // false = showing CardBack; true = showing CardFront
  isActivated?: boolean; // triggers the golden runic surge
  isDissolving?: boolean; // triggers dissolution into particles
  viewportChromeRem?: number; // vertical space reserved for surrounding phase UI
  className?: string;
}

/**
 * 2.5D Card component for "O CRIADOR" ("THE CREATOR").
 * Features realistic 3D Y-axis flip, foil sheen, subtle interactive tilt,
 * authentic dark fantasy artifact proportions (0.67 ratio: 848x1264),
 * and high-depth shadows using CSS 3D transforms.
 */
export function CreatorCard({
  character,
  isFlipped,
  isActivated = false,
  isDissolving = false,
  viewportChromeRem = 7,
  className = "",
}: CreatorCardProps) {
  const { reducedMotion } = useUiStore();
  const systemReduced = useReducedMotion();
  const isReduced = reducedMotion === "reduced" || (reducedMotion === "system" && systemReduced);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -(y * 10), y: x * 10 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      className={`relative mx-auto flex items-center justify-center select-none ${className}`}
      style={{
        perspective: isReduced ? "none" : "1200px",
        width: `min(580px, 92vw, calc((100dvh - ${viewportChromeRem}rem) * 848 / 1264))`,
        aspectRatio: "848 / 1264",
      }}
      data-testid="creator-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Golden Flare on Card Reveal / Flip */}
      {isFlipped && !isReduced && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.9, 0.25], scale: [0.7, 1.3, 1.1] }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="pointer-events-none absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(254,240,138,0.45)_0%,rgba(245,158,11,0.25)_40%,transparent_72%)] blur-2xl"
        />
      )}

      {/* Radiant Divine Wave on Effect Activation */}
      {isActivated && !isReduced && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 1, 0.4], scale: [0.85, 1.35, 1.2] }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.55)_0%,rgba(217,119,6,0.3)_45%,transparent_75%)] blur-3xl animate-pulse"
          />
          {/* Circular Arcane Shockwave Expanding Ring */}
          <motion.div
            initial={{ opacity: 0.8, scale: 0.75 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] aspect-square rounded-full border border-amber-300/60 shadow-[0_0_40px_rgba(245,158,11,0.7)]"
          />
        </>
      )}

      {/* 3D Rotating Card Container */}
      <motion.div
        className="creator-card-3d-root relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
        }}
        initial={false}
        animate={
          isDissolving
            ? { opacity: 0, scale: 0.85, filter: "brightness(2) blur(8px)" }
            : {
                rotateY: isFlipped ? 0 : 180,
                rotateX: tilt.x,
                rotateZ: 0,
                scale: isActivated ? 1.04 : 1,
                opacity: 1,
              }
        }
        transition={{
          rotateY: { duration: isReduced ? 0.05 : 0.85, ease: [0.25, 1, 0.5, 1] },
          rotateX: { duration: 0.15, ease: "easeOut" },
          scale: { duration: 0.4 },
          opacity: { duration: isDissolving ? 0.7 : 0.3 },
        }}
      >
        {/* Front Face (Visible when rotateY is 0) */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
          }}
        >
          <CreatorCardFront character={character} isActivated={isActivated} />
        </div>

        {/* Back Face (Visible when rotateY is 180) */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CreatorCardBack />
        </div>

        {/* Holographic Gilded Sheen Overlay */}
        {!isReduced && (
          <div
            className="pointer-events-none absolute inset-0 opacity-15 mix-blend-color-dodge transition-opacity duration-300"
            style={{
              background: `linear-gradient(${115 + tilt.y * 3}deg, transparent 20%, rgba(254, 240, 138, 0.4) 45%, rgba(245, 158, 11, 0.6) 55%, transparent 80%)`,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
