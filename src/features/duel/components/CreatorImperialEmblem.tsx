import React from "react";
import { clsx } from "clsx";

interface CreatorImperialEmblemProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Legendary Dark Fantasy Imperial Seal.
 * Crafted with aged gold relief, forged iron, polished obsidian,
 * heraldic acanthus filigree, and faceted sovereign jewels.
 */
export function CreatorImperialEmblem({
  className,
  size = "md",
}: CreatorImperialEmblemProps) {
  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-16 h-16 sm:w-20 sm:h-20",
    lg: "w-20 h-20 sm:w-24 sm:h-24",
  }[size];

  return (
    <div
      className={clsx(
        "relative flex items-center justify-center select-none",
        sizeClasses,
        className
      )}
      role="img"
      aria-label="Selo Imperial do Criador"
    >
      <svg
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_16px_rgba(217,119,6,0.45)]"
        aria-hidden="true"
      >
        <defs>
          {/* Aged Gold Metallic Gradients */}
          <linearGradient id="cie-gold-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id="cie-gold-deep" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="40%" stopColor="#78350f" />
            <stop offset="75%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Dark Obsidian Plate Gradients */}
          <radialGradient id="cie-obsidian-core" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#1e1824" />
            <stop offset="55%" stopColor="#100d16" />
            <stop offset="85%" stopColor="#08070b" />
            <stop offset="100%" stopColor="#030305" />
          </radialGradient>

          {/* Imperial Ruby Cabochon */}
          <radialGradient id="cie-ruby" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="30%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Imperial Amber Gems */}
          <radialGradient id="cie-amber" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="30%" stopColor="#fbbf24" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
        </defs>

        {/* ---------------- 1. BACKGROUND RADIANT ORNAMENT / HALO ---------------- */}
        {/* Subtle 8-point sunburst points */}
        <path
          d="M48 2L52 14L60 6L58 18L72 16L64 26L80 30L68 38L84 48L68 58L80 66L64 70L72 80L58 78L60 90L52 82L48 94L44 82L36 90L38 78L24 80L32 70L16 66L28 58L12 48L28 38L16 30L32 26L24 16L38 18L36 6L44 14Z"
          fill="url(#cie-gold-deep)"
          opacity="0.32"
        />

        {/* ---------------- 2. HERALDIC FLANKING ACANTHUS SCROLLS ---------------- */}
        {/* Left heraldic wing/scroll */}
        <path
          d="M24 38C19 32 14 36 10 42C12 48 18 51 22 49C16 52 13 58 15 64C19 62 23 57 25 52C22 58 23 66 28 71C30 65 31 58 30 52C32 58 37 63 42 66C40 60 38 54 36 49C32 43 28 40 24 38Z"
          fill="url(#cie-gold-light)"
          opacity="0.75"
        />
        {/* Right heraldic wing/scroll (mirrored) */}
        <path
          d="M72 38C77 32 82 36 86 42C84 48 78 51 74 49C80 52 83 58 81 64C77 62 73 57 71 52C74 58 73 66 68 71C66 65 65 58 66 52C64 58 59 63 54 66C56 60 58 54 60 49C64 43 68 40 72 38Z"
          fill="url(#cie-gold-light)"
          opacity="0.75"
        />

        {/* ---------------- 3. MAIN CARTOUCHE: FORGED IRON & OBSIDIAN SEAL ---------------- */}
        {/* Outer Heavy Octagonal Iron Rim with Stepped Corners */}
        <path
          d="M48 6 L68 14 L82 28 L90 48 L82 68 L68 82 L48 90 L28 82 L14 68 L6 48 L14 28 L28 14 Z"
          fill="#141118"
          stroke="url(#cie-gold-deep)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner Gold Filigree Bevel Ring */}
        <path
          d="M48 10 L65 17 L78 30 L85 48 L78 66 L65 79 L48 86 L31 79 L18 66 L11 48 L18 30 L31 17 Z"
          fill="url(#cie-obsidian-core)"
          stroke="url(#cie-gold-light)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Inset Engraved Runic Ring */}
        <circle
          cx="48"
          cy="48"
          r="32"
          stroke="url(#cie-gold-deep)"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.6"
        />

        {/* 4 Cardinal Studs / Imperial Seal Rivets */}
        <circle cx="48" cy="11" r="2.2" fill="url(#cie-gold-light)" stroke="#451a03" strokeWidth="0.8" />
        <circle cx="85" cy="48" r="2.2" fill="url(#cie-gold-light)" stroke="#451a03" strokeWidth="0.8" />
        <circle cx="48" cy="85" r="2.2" fill="url(#cie-gold-light)" stroke="#451a03" strokeWidth="0.8" />
        <circle cx="11" cy="48" r="2.2" fill="url(#cie-gold-light)" stroke="#451a03" strokeWidth="0.8" />

        {/* ---------------- 4. THE SOVEREIGN IMPERIAL CROWN ---------------- */}
        {/* Crown Shadow/Backing for 3D metallic lift */}
        <path
          d="M26 62L22 36L34 45L48 24L62 45L74 36L70 62Z"
          fill="#000000"
          opacity="0.65"
          transform="translate(0, 3)"
        />

        {/* Crown Base Body (Aged Gold Facets) */}
        <path
          d="M26 61L22 35L34 44L48 23L62 44L74 35L70 61Z"
          fill="url(#cie-gold-deep)"
        />

        {/* Crown Left Light Facet (Zenith Highlight) */}
        <path
          d="M48 23L34 44L22 35L26 61L48 61Z"
          fill="url(#cie-gold-light)"
          opacity="0.85"
        />

        {/* Central Crown Spear / Scepter Point (Center Spire Accent) */}
        <polygon points="48,18 51,25 48,34 45,25" fill="url(#cie-gold-light)" />
        <line x1="48" y1="18" x2="48" y2="60" stroke="#fef08a" strokeWidth="1.2" opacity="0.75" />

        {/* Flanking Spire Diamond Tips */}
        <polygon points="22,33 24,36 22,39 20,36" fill="url(#cie-gold-light)" />
        <polygon points="74,33 76,36 74,39 72,36" fill="url(#cie-gold-light)" />
        <polygon points="34,42 36,45 34,48 32,45" fill="url(#cie-gold-light)" />
        <polygon points="62,42 64,45 62,48 60,45" fill="url(#cie-gold-light)" />

        {/* Chiseled Crown Ridge Ribs */}
        <line x1="22" y1="36" x2="28" y2="61" stroke="url(#cie-gold-deep)" strokeWidth="1.2" />
        <line x1="34" y1="45" x2="38" y2="61" stroke="url(#cie-gold-deep)" strokeWidth="1.2" />
        <line x1="62" y1="45" x2="58" y2="61" stroke="url(#cie-gold-deep)" strokeWidth="1.2" />
        <line x1="74" y1="36" x2="68" y2="61" stroke="url(#cie-gold-deep)" strokeWidth="1.2" />

        {/* ---------------- 5. IMPERIAL CROWN BAND & JEWELS ---------------- */}
        {/* Crown Lower Headband Outer Trim */}
        <path
          d="M24 61 C32 63.5 64 63.5 72 61 L70 68 C62 70.5 34 70.5 26 68 Z"
          fill="#120f18"
          stroke="url(#cie-gold-light)"
          strokeWidth="1.4"
        />

        {/* Headband Center Ruby Jewel */}
        <ellipse cx="48" cy="65.5" rx="3.6" ry="2.6" fill="url(#cie-ruby)" stroke="#fef08a" strokeWidth="0.8" />
        {/* Ruby Specular Spark */}
        <circle cx="47" cy="64.8" r="0.8" fill="#ffffff" opacity="0.9" />

        {/* Left Amber Jewel */}
        <ellipse cx="35" cy="65" rx="2.5" ry="1.8" fill="url(#cie-amber)" stroke="#fef08a" strokeWidth="0.6" />
        <circle cx="34.3" cy="64.5" r="0.6" fill="#ffffff" opacity="0.8" />

        {/* Right Amber Jewel */}
        <ellipse cx="61" cy="65" rx="2.5" ry="1.8" fill="url(#cie-amber)" stroke="#fef08a" strokeWidth="0.6" />
        <circle cx="60.3" cy="64.5" r="0.6" fill="#ffffff" opacity="0.8" />

        {/* ---------------- 6. LOWER BASE PENDANT ORNAMENT ---------------- */}
        {/* Bottom Fleur-de-lis / Seal Pendant Anchor */}
        <path
          d="M48 69 L53 74 L48 81 L43 74 Z"
          fill="url(#cie-gold-light)"
          stroke="url(#cie-gold-deep)"
          strokeWidth="1"
        />
        <circle cx="48" cy="74.5" r="1.2" fill="#451a03" />
      </svg>
    </div>
  );
}
