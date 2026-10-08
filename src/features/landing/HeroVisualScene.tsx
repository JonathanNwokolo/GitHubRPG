"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { RpgSparkles, RpgShield, RpgTrophy } from "@/design-system";

interface HeroVisualSceneProps {
  metricHeroes: string;
  metricAchievements: string;
  metricOpenSource: string;
}

export const HeroVisualScene: React.FC<HeroVisualSceneProps> = ({
  metricHeroes,
  metricAchievements,
  metricOpenSource,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsets, setOffsets] = useState({
    bgX: 0,
    bgY: 0,
    fgX: 0,
    fgY: 0,
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

      // Midground/castle moves subtly (max 8px)
      // Foreground knight moves more (max 18px)
      setOffsets({
        bgX: x * 8,
        bgY: y * 6,
        fgX: -x * 16,
        fgY: -y * 12,
      });
    },
    [prefersReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setOffsets({ bgX: 0, bgY: 0, fgX: 0, fgY: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex w-full items-center justify-center select-none"
      style={{ perspective: 1000 }}
    >
      {/* Outer framing container with decorative borders and RPG vignette */}
      <div className="relative w-full max-w-[560px] lg:max-w-[620px] xl:max-w-[660px] aspect-[4/3] sm:aspect-[16/11] lg:aspect-[16/11] rounded-2xl overflow-hidden border border-[#5b4528]/80 bg-[#08090d] shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.08)]">
        
        {/* Layer 1: Background — Dark Gothic Castle & Moon */}
        <div
          className="absolute -inset-4 sm:-inset-6 transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: prefersReducedMotion
              ? "none"
              : `translate3d(${offsets.bgX}px, ${offsets.bgY}px, 0) scale(1.04)`,
          }}
        >
          <Image
            src="/hero/hero-bg.webp"
            alt="Castelo gótico ancestral sob lua cheia"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover object-center filter brightness-[0.88] contrast-[1.05]"
          />
        </div>

        {/* Ethereal atmosphere / moon glow gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08090d] via-transparent to-transparent opacity-90"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-radial-at-c from-amber-500/10 via-transparent to-black/40 mix-blend-screen"
          aria-hidden="true"
        />

        {/* Layer 2: Foreground — Armored Knight Champion */}
        <div
          className="absolute inset-0 flex items-end justify-end pointer-events-none transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: prefersReducedMotion
              ? "none"
              : `translate3d(${offsets.fgX}px, ${offsets.fgY}px, 0)`,
          }}
        >
          <div className="relative w-[78%] h-[95%] sm:w-[72%] sm:h-[98%] right-[-4%] sm:right-[-2%] bottom-[-2%]">
            <Image
              src="/hero/hero-knight.webp"
              alt="Guerreiro lendário empunhando lâmina rúnica dourada"
              fill
              sizes="(max-width: 768px) 70vw, 40vw"
              priority
              className="object-contain object-bottom drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]"
            />
          </div>
        </div>

        {/* Layer 3: Mystical Effects & Sword Ember Glow */}
        <div
          className="pointer-events-none absolute bottom-8 right-12 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl animate-pulse"
          aria-hidden="true"
        />

        {/* Ambient framing & corner accents */}
        <div
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#eab308]/20 rounded-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#fbbf24]/60"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#fbbf24]/60"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#fbbf24]/60"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#fbbf24]/60"
          aria-hidden="true"
        />

        {/* Floating Badge / Metrics Card (RPG Style) */}
        <aside
          aria-label="Estatísticas da comunidade"
          className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 flex flex-col gap-2 rounded-lg border border-[#785b2e]/90 bg-[#0e111a]/85 p-3.5 sm:p-4 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.7),0_0_15px_rgba(245,158,11,0.12)] max-w-[210px] sm:max-w-[240px] transition-transform duration-300 group-hover:translate-y-[-2px]"
        >
          <div className="flex items-center gap-2 border-b border-[#3d2e1b] pb-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300">
            <RpgSparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{metricHeroes}</span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px] sm:text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2">
              <RpgTrophy className="h-3.5 w-3.5 text-yellow-400/90 shrink-0" />
              <span>{metricAchievements}</span>
            </div>
            <div className="flex items-center gap-2">
              <RpgShield className="h-3.5 w-3.5 text-sky-400/90 shrink-0" />
              <span>{metricOpenSource}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
