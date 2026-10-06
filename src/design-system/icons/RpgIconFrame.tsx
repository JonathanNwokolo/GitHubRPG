import React from "react";
import { clsx } from "clsx";

export type IconRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "gold"
  | "arcane"
  | "crimson"
  | "azure"
  | "emerald";

export type IconContainerShape = "none" | "hex" | "shield" | "slate" | "circle";
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface RpgIconFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: IconSize;
  shape?: IconContainerShape;
  rarity?: IconRarity;
  interactive?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

const SIZE_MAP: Record<IconSize, { container: string; inner: string }> = {
  xs: { container: "w-5 h-5", inner: "w-3.5 h-3.5" },
  sm: { container: "w-7 h-7", inner: "w-4 h-4" },
  md: { container: "w-9 h-9", inner: "w-5 h-5" },
  lg: { container: "w-12 h-12", inner: "w-7 h-7" },
  xl: { container: "w-16 h-16", inner: "w-10 h-10" },
};

const RARITY_THEMES: Record<
  IconRarity,
  {
    border: string;
    bg: string;
    glowClass: string;
    text: string;
  }
> = {
  common: {
    border: "border-slate-600/80 hover:border-slate-400",
    bg: "from-slate-800/90 to-slate-950/95",
    glowClass: "shadow-[0_0_8px_rgba(148,163,184,0.15)]",
    text: "text-slate-300",
  },
  rare: {
    border: "border-sky-500/80 hover:border-sky-300",
    bg: "from-sky-950/70 to-slate-950/95",
    glowClass: "shadow-[0_0_12px_rgba(56,189,248,0.35)]",
    text: "text-sky-300",
  },
  epic: {
    border: "border-purple-500/80 hover:border-purple-300",
    bg: "from-purple-950/70 to-slate-950/95",
    glowClass: "shadow-[0_0_14px_rgba(192,132,252,0.35)]",
    text: "text-purple-300",
  },
  legendary: {
    border: "border-amber-400/90 hover:border-amber-200",
    bg: "from-amber-950/60 to-slate-950/95",
    glowClass: "shadow-[0_0_16px_rgba(251,191,36,0.45)]",
    text: "text-amber-300",
  },
  gold: {
    border: "border-amber-500/85 hover:border-amber-300",
    bg: "from-amber-950/70 to-slate-950/95",
    glowClass: "shadow-[0_0_14px_rgba(245,158,11,0.4)]",
    text: "text-amber-400",
  },
  arcane: {
    border: "border-purple-500/85 hover:border-purple-300",
    bg: "from-purple-950/70 to-slate-950/95",
    glowClass: "shadow-[0_0_14px_rgba(168,85,247,0.4)]",
    text: "text-purple-400",
  },
  crimson: {
    border: "border-red-500/85 hover:border-red-300",
    bg: "from-red-950/70 to-slate-950/95",
    glowClass: "shadow-[0_0_14px_rgba(239,68,68,0.4)]",
    text: "text-red-400",
  },
  azure: {
    border: "border-cyan-500/85 hover:border-cyan-300",
    bg: "from-cyan-950/70 to-slate-950/95",
    glowClass: "shadow-[0_0_14px_rgba(6,182,212,0.4)]",
    text: "text-cyan-400",
  },
  emerald: {
    border: "border-emerald-500/85 hover:border-emerald-300",
    bg: "from-emerald-950/70 to-slate-950/95",
    glowClass: "shadow-[0_0_14px_rgba(16,185,129,0.4)]",
    text: "text-emerald-400",
  },
};

/**
 * RpgIconFrame: Chiseled Fantasy Container / Medallion for Game UI icons.
 * Provides heraldic bevels, chamfered silhouettes, radial energy backdrops,
 * and rarity/affinity glow states.
 */
export const RpgIconFrame: React.FC<RpgIconFrameProps> = ({
  size = "md",
  shape = "none",
  rarity = "common",
  interactive = false,
  glow = false,
  className,
  children,
  ...props
}) => {
  if (shape === "none") {
    return (
      <span
        className={clsx(
          "inline-flex items-center justify-center flex-shrink-0 transition-transform duration-150",
          SIZE_MAP[size].inner,
          interactive && "hover:scale-110",
          glow && RARITY_THEMES[rarity].glowClass,
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  const theme = RARITY_THEMES[rarity];

  // Specific geometric styling per container shape
  const shapeClasses = {
    // Hex Crest: 6-sided chamfered medallion
    hex: "clip-path-hex border-2",
    // Heraldic Shield: flat top, angled base
    shield: "rounded-b-lg border-2 border-t-2",
    // Rune Slate: Square with chamfered 45-degree corners
    slate: "border-2 border-rpg-borderLight",
    // Arcane Ring: Circular medallion with double rim
    circle: "rounded-full border-2",
  }[shape];

  return (
    <div
      className={clsx(
        "relative inline-flex items-center justify-center flex-shrink-0 select-none transition-all duration-200",
        "bg-gradient-to-b shadow-pixel",
        theme.bg,
        theme.border,
        shapeClasses,
        SIZE_MAP[size].container,
        (glow || interactive) && theme.glowClass,
        interactive && "cursor-pointer hover:scale-105 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {/* Specular rim highlight at top */}
      <div
        className="pointer-events-none absolute inset-x-1 top-0.5 h-[1px] bg-white/20"
        aria-hidden="true"
      />

      {/* Inner glyph wrapper */}
      <div
        className={clsx(
          "flex items-center justify-center relative z-10 transition-transform duration-150",
          SIZE_MAP[size].inner,
          theme.text
        )}
      >
        {children}
      </div>
    </div>
  );
};
