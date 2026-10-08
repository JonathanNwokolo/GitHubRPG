import React from "react";
import { clsx } from "clsx";
import { RpgSwords } from "@/design-system";

interface DuelVsBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
  showWings?: boolean;
}

/**
 * Ornate chiseled confrontation seal for the Duel Arena.
 * Features a dark iron ring with aged-gold rim, ruby core radiance,
 * background watermark crossed blades, and high-contrast pixel typography.
 */
export function DuelVsBadge({
  size = "md",
  className,
  ariaLabel,
  showWings = false,
}: DuelVsBadgeProps) {
  const sizeClasses = {
    sm: "h-12 w-12 text-sm",
    md: "h-16 w-16 sm:h-20 sm:w-20 text-base sm:text-xl",
    lg: "h-20 w-20 sm:h-24 sm:w-24 text-xl sm:text-2xl",
  }[size];

  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-10 w-10 sm:h-12 sm:w-12",
    lg: "h-12 w-12 sm:h-14 sm:w-14",
  }[size];

  return (
    <div
      className={clsx("relative inline-flex items-center justify-center select-none", className)}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      aria-hidden={!ariaLabel}
    >
      {/* Decorative runic wings for desktop confrontation layouts */}
      {showWings ? (
        <div className="hidden lg:flex items-center absolute -inset-x-8 pointer-events-none">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-600/40 to-amber-500/70" />
          <div className="w-20 sm:w-24" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-600/40 to-amber-500/70" />
        </div>
      ) : null}

      {/* Outer beveled medallion */}
      <div
        className={clsx(
          "relative flex items-center justify-center rounded-full",
          "border-2 border-rpg-goldDark bg-gradient-to-br from-rpg-obsidian via-red-950/40 to-rpg-void",
          "shadow-[0_0_20px_rgba(239,68,68,0.3),inset_0_0_12px_rgba(0,0,0,0.8)]",
          "ring-1 ring-amber-500/30",
          sizeClasses
        )}
      >
        {/* Watermark crossed blades */}
        <RpgSwords
          className={clsx(
            "absolute text-red-600/25 pointer-events-none transition-transform duration-300",
            iconSizes
          )}
        />

        {/* Central glowing VS text */}
        <span className="relative font-pixel font-bold tracking-wider text-amber-200 drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
          VS
        </span>
      </div>
    </div>
  );
}
