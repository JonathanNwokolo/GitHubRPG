"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useUiStore } from "@/stores/useUiStore";
import "./home-scene.css";

/**
 * Fixed ember layout: [left %, delay s, duration s, horizontal drift px, size px].
 * Hand-placed instead of random so server and client render the same markup.
 */
const EMBERS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [6, 0, 13, 26, 3],
  [14, 4.5, 11, -18, 2],
  [21, 8, 15, 34, 2],
  [29, 2, 12, -22, 3],
  [36, 10, 14, 16, 2],
  [43, 6, 16, -30, 2],
  [57, 1.5, 13, 24, 2],
  [64, 9, 12, -14, 3],
  [71, 3.5, 15, 28, 2],
  [78, 7, 11, -26, 2],
  [86, 0.8, 14, 20, 3],
  [93, 5.5, 12, -20, 2],
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface HomeSceneProps {
  children: React.ReactNode;
  /** When this section rises into view, the entrance hall crossfades into the inner sanctum. */
  sanctumAnchorId: string;
}

/**
 * Full-page dark fantasy set for the Home: a monumental hall drawn in depth layers
 * (far hall → sanctum → fog → pillars → embers → foreground props → reading focus).
 * The set sits in a sticky stage behind the content, so the Hero and the Hall of Heroes
 * read as two places of the same building. Purely decorative: no data, no layout impact.
 */
export function HomeScene({ children, sanctumAnchorId }: HomeSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useUiStore();
  const systemReduced = useReducedMotion();
  const shouldReduce = reducedMotion === "reduced" || (reducedMotion === "system" && Boolean(systemReduced));

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    // Depth is written as CSS variables on the stage: no React re-render per frame.
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let frame = 0;

    const write = () => {
      frame = 0;
      const viewport = window.innerHeight || 1;
      const scroll = clamp01(-root.getBoundingClientRect().top / viewport);
      const anchor = document.getElementById(sanctumAnchorId);
      const sanctum = anchor ? clamp01((viewport * 0.75 - anchor.getBoundingClientRect().top) / (viewport * 0.5)) : 0;

      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      stage.style.setProperty("--scene-scroll", scroll.toFixed(4));
      stage.style.setProperty("--scene-sanctum", sanctum.toFixed(4));
      stage.style.setProperty("--scene-px", pointer.x.toFixed(4));
      stage.style.setProperty("--scene-py", pointer.y.toFixed(4));

      // Keep easing only while the pointer offset is still settling.
      if (Math.abs(pointer.targetX - pointer.x) > 0.002 || Math.abs(pointer.targetY - pointer.y) > 0.002) {
        frame = window.requestAnimationFrame(write);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(write);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.targetX = (event.clientX / (window.innerWidth || 1)) * 2 - 1;
      pointer.targetY = (event.clientY / (window.innerHeight || 1)) * 2 - 1;
      schedule();
    };

    const onPointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
      schedule();
    };

    write();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    // Pointer parallax only for precise pointers (desktop) and never under reduced motion.
    const pointerParallax = !shouldReduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (pointerParallax) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    } else {
      pointer.targetX = 0;
      pointer.targetY = 0;
      schedule();
    }

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sanctumAnchorId, shouldReduce]);

  return (
    <div ref={rootRef} className="home-scene" data-motion={shouldReduce ? "reduced" : "full"}>
      <div className="home-scene__backdrop" aria-hidden="true">
        <div ref={stageRef} className="home-scene__stage">
          {/* Far plane: the entrance nave, then the sanctum of hero statues. */}
          <div className="home-scene__plane home-scene__far">
            <Image src="/home-scene/hall-far.webp" alt="" fill priority sizes="100vw" className="home-scene__img" />
          </div>
          <div className="home-scene__plane home-scene__sanctum">
            <Image src="/home-scene/hall-sanctum.webp" alt="" fill sizes="100vw" className="home-scene__img" />
          </div>
          <div className="home-scene__haze" />
          <div className="home-scene__shafts" />
          <div className="home-scene__fog home-scene__fog--back" />

          {/* Mid/near plane: the pillars that frame the nave. */}
          <div className="home-scene__pillar home-scene__pillar--left">
            <div className="home-scene__pillar-body">
              <Image src="/home-scene/pillar.webp" alt="" width={615} height={1376} sizes="(max-width: 768px) 45vw, 30vw" className="home-scene__pillar-img" />
              <span className="home-scene__torch" />
            </div>
          </div>
          <div className="home-scene__pillar home-scene__pillar--right">
            <div className="home-scene__pillar-body">
              <Image src="/home-scene/pillar.webp" alt="" width={615} height={1376} sizes="(max-width: 768px) 45vw, 30vw" className="home-scene__pillar-img" />
              <span className="home-scene__torch" />
            </div>
          </div>

          <div className="home-scene__fog home-scene__fog--front" />

          <div className="home-scene__embers">
            {EMBERS.map(([left, delay, duration, drift, size], index) => (
              <span
                key={index}
                className="home-scene__ember"
                style={
                  {
                    left: `${left}%`,
                    width: size,
                    height: size,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                    "--ember-drift": `${drift}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Foreground: candles and fallen stone at the edges of the frame. */}
          <div className="home-scene__props home-scene__props--left">
            <Image src="/home-scene/props-left.webp" alt="" width={655} height={514} sizes="(max-width: 1024px) 34vw, 26vw" className="home-scene__props-img" />
            <span className="home-scene__candle-glow" />
          </div>
          <div className="home-scene__props home-scene__props--right">
            <Image src="/home-scene/props-right.webp" alt="" width={469} height={506} sizes="(max-width: 1024px) 26vw, 19vw" className="home-scene__props-img" />
            <span className="home-scene__candle-glow" />
          </div>

          {/* Reading zones: a dark focus cone behind the Hero, a wider one behind the Hall. */}
          <div className="home-scene__focus" />
          <div className="home-scene__focus home-scene__focus--sanctum" />
        </div>
      </div>

      <div className="home-scene__content">{children}</div>
      <div className="home-scene__threshold" aria-hidden="true" />
    </div>
  );
}
