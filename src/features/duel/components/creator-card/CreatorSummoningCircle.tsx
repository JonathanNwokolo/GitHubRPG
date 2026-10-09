"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { useUiStore } from "@/stores/useUiStore";

interface CreatorSummoningCircleProps {
  className?: string;
  size?: number;
}

/**
 * Concentric arcane summoning circle for the Creator Override sequence.
 * Features rotating ancient runic wheels, celestial solar rays, and an amber mana core.
 */
export function CreatorSummoningCircle({
  className = "",
  size = 380,
}: CreatorSummoningCircleProps) {
  const { reducedMotion } = useUiStore();
  const systemReduced = useReducedMotion();
  const isReduced = reducedMotion === "reduced" || (reducedMotion === "system" && systemReduced);

  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Radiant Solar Background Bloom */}
      <div
        className="absolute inset-0 rounded-full bg-radial from-amber-500/25 via-amber-600/10 to-transparent blur-xl animate-pulse"
        style={{ animationDuration: "3s" }}
      />

      <svg
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]"
      >
        <defs>
          <linearGradient id="circleGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <radialGradient id="summonCoreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>

          {/* Path for text along outer circle */}
          <path
            id="outerRunicPath"
            d="M 200,200 m -175,0 a 175,175 0 1,1 350,0 a 175,175 0 1,1 -350,0"
          />
          {/* Path for text along inner circle */}
          <path
            id="innerRunicPath"
            d="M 200,200 m -120,0 a 120,120 0 1,0 240,0 a 120,120 0 1,0 -240,0"
          />
        </defs>

        {/* Layer 1: Outermost boundary ring & ticks */}
        <circle
          cx="200"
          cy="200"
          r="192"
          fill="none"
          stroke="url(#circleGoldGrad)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          opacity="0.65"
        />
        <circle
          cx="200"
          cy="200"
          r="185"
          fill="none"
          stroke="url(#circleGoldGrad)"
          strokeWidth="2"
          opacity="0.85"
        />

        {/* Layer 2: Rotating Outer Rune Circle (Clockwise) */}
        <motion.g
          animate={isReduced ? undefined : { rotate: 360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "200px 200px" }}
        >
          <circle
            cx="200"
            cy="200"
            r="165"
            fill="none"
            stroke="url(#circleGoldGrad)"
            strokeWidth="1"
            opacity="0.7"
          />
          <text
            fill="#fde047"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="5"
            opacity="0.8"
          >
            <textPath href="#outerRunicPath" startOffset="0%">
              ✦ ᚛ ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ ᚜ ✦ ROOT_AUTHORITY_ARENA_FABRIC_CREATOR_DOMAIN ✦ ᚛ ᛟ ᛞ ᛜ ᛚ ᛗ ᛖ ᛒ ᛏ ᛊ ᛉ ᛈ ᛇ ᛃ ᛁ ᚾ ᚺ ᚹ ᚷ ᚲ ᚱ ᚨ ᚦ ᚢ ᚠ ᚜ ✦
            </textPath>
          </text>
        </motion.g>

        {/* Layer 3: Sacred Octagram Geometry */}
        <g stroke="url(#circleGoldGrad)" strokeWidth="1" opacity="0.45" fill="none">
          {/* Square 1 */}
          <polygon points="200,60 340,200 200,340 60,200" />
          {/* Square 2 (45° rotated) */}
          <polygon points="101,101 299,101 299,299 101,299" />
          {/* Cardinal Axis Cross */}
          <line x1="200" y1="30" x2="200" y2="370" strokeDasharray="3 3" opacity="0.5" />
          <line x1="30" y1="200" x2="370" y2="200" strokeDasharray="3 3" opacity="0.5" />
        </g>

        {/* Layer 4: Middle Rune Circle (Counter-Clockwise) */}
        <motion.g
          animate={isReduced ? undefined : { rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "200px 200px" }}
        >
          <circle
            cx="200"
            cy="200"
            r="130"
            fill="none"
            stroke="url(#circleGoldGrad)"
            strokeWidth="1.5"
            opacity="0.8"
          />
          <text
            fill="#f59e0b"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="4"
            opacity="0.9"
          >
            <textPath href="#innerRunicPath" startOffset="0%">
              ✵ ABSOLUTE_INVERSION ✵ THE_CREATOR_CANNOT_BE_DEFEATED ✵ DOMAIN_SOVEREIGN ✵ JONATHAN_NWOKOLO ✵
            </textPath>
          </text>
          <circle
            cx="200"
            cy="200"
            r="110"
            fill="none"
            stroke="url(#circleGoldGrad)"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.6"
          />
        </motion.g>

        {/* Layer 5: Inner Sun Ray Wheel */}
        <g stroke="url(#circleGoldGrad)" strokeWidth="1.5" opacity="0.75">
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16;
            return (
              <line
                key={i}
                x1="200"
                y1="110"
                x2="200"
                y2="90"
                transform={`rotate(${angle} 200 200)`}
                opacity={i % 2 === 0 ? "0.9" : "0.5"}
              />
            );
          })}
        </g>

        {/* Layer 6: Core Runic Medallion */}
        <circle cx="200" cy="200" r="75" fill="none" stroke="url(#circleGoldGrad)" strokeWidth="2" opacity="0.9" />
        <circle cx="200" cy="200" r="70" fill="url(#summonCoreGrad)" />
        <circle cx="200" cy="200" r="62" fill="none" stroke="url(#circleGoldGrad)" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />

        {/* Royal Crown Sigil in the Core */}
        <g fill="#fde047" opacity="0.95" transform="translate(180, 182) scale(1)">
          {/* Crown path */}
          <path d="M 3,24 L 7,10 L 17,18 L 23,6 L 29,18 L 39,10 L 43,24 Z" />
          {/* Crown base bar */}
          <rect x="3" y="26" width="40" height="4" rx="1" fill="#f59e0b" />
          {/* Jewels */}
          <circle cx="7" cy="8" r="1.5" fill="#fef08a" />
          <circle cx="23" cy="4" r="2" fill="#fef08a" />
          <circle cx="39" cy="8" r="1.5" fill="#fef08a" />
        </g>
      </svg>
    </div>
  );
}
