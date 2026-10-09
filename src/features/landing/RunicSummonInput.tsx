"use client";

import React, { forwardRef, InputHTMLAttributes } from "react";
import { clsx } from "clsx";

/**
 * Custom Arcane Scrying Eye / Divination Lens.
 * Replaces generic search icon with a dark fantasy celestial divination focus.
 */
function ArcaneScryingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx("w-5 h-5 select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="asi-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="80%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id="asi-core" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
      </defs>

      {/* Outer Runic Ring with Directional Compass Points */}
      <circle
        cx="11"
        cy="11"
        r="7.5"
        stroke="url(#asi-gold)"
        strokeWidth="1.6"
        strokeDasharray="18 2 2 2"
      />
      {/* 4 Cardinal Alignment Marks */}
      <line x1="11" y1="1.8" x2="11" y2="4" stroke="url(#asi-gold)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="18" x2="11" y2="20.2" stroke="url(#asi-gold)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1.8" y1="11" x2="4" y2="11" stroke="url(#asi-gold)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="11" x2="20.2" y2="11" stroke="url(#asi-gold)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Inner Divination Iris Diamond */}
      <polygon
        points="11,5.5 15.5,11 11,16.5 6.5,11"
        fill="url(#asi-core)"
        stroke="url(#asi-gold)"
        strokeWidth="1"
      />

      {/* Central Astral Spark Pupil */}
      <circle cx="11" cy="11" r="2" fill="#120f18" stroke="url(#asi-gold)" strokeWidth="0.8" />
      <circle cx="10.2" cy="10.2" r="0.8" fill="#ffffff" />

      {/* Ornate Handle / Astrolabe Tail with Runic Spur */}
      <path
        d="M16.5 16.5 L21.5 21.5"
        stroke="url(#asi-gold)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="21.5" cy="21.5" r="1.2" fill="url(#asi-gold)" />
      <path
        d="M17 19 L19 17"
        stroke="url(#asi-gold)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Detailed Ornamental RPG Corner Bracket (mirrored with CSS).
 */
function RunicCorner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx("w-3.5 h-3.5 pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <path
        d="M1 15V1H15"
        stroke="#d97706"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <path
        d="M3 13V3H13"
        stroke="#fef08a"
        strokeWidth="1"
        strokeLinecap="square"
        opacity="0.85"
      />
      <circle cx="4" cy="4" r="1.2" fill="#fef08a" stroke="#78350f" strokeWidth="0.6" />
      <polygon points="1,1 6,1 1,6" fill="#f59e0b" />
    </svg>
  );
}

export interface RunicSummonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean | null;
}

/**
 * Dark Fantasy Runic Summoning Input.
 * Features an obsidian slab frame, aged-gold filigree border, detailed RPG corners,
 * custom arcane scrying eye, and discrete ambient illumination on focus.
 */
export const RunicSummonInput = forwardRef<HTMLInputElement, RunicSummonInputProps>(
  ({ className, disabled, error, ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <div
        className={clsx(
          "group relative flex w-full items-center min-h-[52px] h-[52px] select-none",
          "border transition-all duration-200",
          /* Background: Deep obsidian slab with depth */
          "bg-gradient-to-b from-[#141219] via-[#0b090f] to-[#050507]",
          "shadow-[inset_0_2px_12px_rgba(0,0,0,0.85),inset_0_0_28px_rgba(0,0,0,0.65)]",
          hasError
            ? "border-red-600/80 shadow-[0_0_16px_rgba(239,68,68,0.25)] focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/50"
            : [
                "border-[#5c4524] hover:border-[#856333]",
                "focus-within:border-amber-400/90",
                "focus-within:shadow-[0_0_20px_rgba(245,158,11,0.22),inset_0_0_14px_rgba(245,158,11,0.08)]",
                "focus-within:ring-1 focus-within:ring-amber-400/40",
              ],
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
      >
        {/* Subtle Inner Hairline Frame */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[3px] border border-amber-400/10 transition-colors duration-200 group-hover:border-amber-400/20 group-focus-within:border-amber-400/35"
        />

        {/* 4 Detailed Ornamental RPG Corners */}
        <RunicCorner className="absolute -top-[1px] -left-[1px] transition-transform duration-200 group-hover:brightness-110 group-focus-within:brightness-125" />
        <RunicCorner className="absolute -top-[1px] -right-[1px] scale-x-[-1] transition-transform duration-200 group-hover:brightness-110 group-focus-within:brightness-125" />
        <RunicCorner className="absolute -bottom-[1px] -left-[1px] scale-y-[-1] transition-transform duration-200 group-hover:brightness-110 group-focus-within:brightness-125" />
        <RunicCorner className="absolute -bottom-[1px] -right-[1px] scale-[-1] transition-transform duration-200 group-hover:brightness-110 group-focus-within:brightness-125" />

        {/* Custom Arcane Scrying Eye Icon */}
        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center transition-transform duration-200 group-focus-within:scale-105 group-focus-within:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
          <ArcaneScryingIcon />
        </div>

        {/* Native Input Element */}
        <input
          ref={ref}
          disabled={disabled}
          className={clsx(
            "w-full h-full bg-transparent pl-12 pr-4",
            "font-sans text-sm sm:text-base font-medium tracking-wide text-slate-100",
            "placeholder:text-stone-500 placeholder:italic",
            "focus:outline-none selection:bg-amber-900/80 selection:text-amber-100",
            disabled && "cursor-not-allowed"
          )}
          {...props}
        />
      </div>
    );
  }
);

RunicSummonInput.displayName = "RunicSummonInput";
