"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useUiStore } from "@/stores/useUiStore";
import "./duel-scene.css";

/**
 * Deterministic battle ember positions: [left %, delay s, duration s, drift px, size px, tone].
 * Fixed coordinates prevent server/client hydration mismatches.
 */
const DUEL_EMBERS: ReadonlyArray<readonly [number, number, number, number, number, "crimson" | "amber"]> = [
  [7, 0, 10, 26, 2, "crimson"],
  [15, 3.2, 13, -18, 3, "amber"],
  [24, 6.8, 11, 22, 2, "crimson"],
  [32, 1.8, 14, -28, 3, "amber"],
  [44, 8.2, 12, 16, 2, "crimson"],
  [56, 4.5, 15, -20, 2, "amber"],
  [68, 2.1, 11, 24, 3, "amber"],
  [76, 7.4, 13, -22, 2, "crimson"],
  [85, 0.6, 12, 18, 2, "amber"],
  [93, 5.1, 14, -24, 3, "crimson"],
];

interface DuelSceneProps {
  children: React.ReactNode;
}

/**
 * Atmospheric dark fantasy battle arena set for the Duel pages.
 * Features the coliseum of champions, eclipse moon glow, battle braziers,
 * chained ancient blades, and dual-tone embers (crimson & amber).
 */
export function DuelScene({ children }: DuelSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useUiStore();
  const systemReduced = useReducedMotion();
  const shouldReduce = reducedMotion === "reduced" || (reducedMotion === "system" && Boolean(systemReduced));

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let frame = 0;

    const write = () => {
      frame = 0;
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      stage.style.setProperty("--duel-px", pointer.x.toFixed(4));
      stage.style.setProperty("--duel-py", pointer.y.toFixed(4));

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
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [shouldReduce]);

  return (
    <div ref={rootRef} className="duel-scene" data-motion={shouldReduce ? "reduced" : "full"}>
      <div className="duel-scene__backdrop" aria-hidden="true">
        <div ref={stageRef} className="duel-scene__stage">
          {/* Layer 1: Coliseum Arena under Eclipse Moon */}
          <div className="duel-scene__plane duel-scene__arena">
            <Image
              src="/duel-scene/arena-bg.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className="duel-scene__img"
            />
          </div>

          {/* Layer 2: Eclipse Moon & Brazier Ambient Aura */}
          <div className="duel-scene__eclipse-glow" />
          <div className="duel-scene__haze" />

          {/* Layer 3: Drifting Smoke */}
          <div className="duel-scene__smoke" />

          {/* Layer 4: Rising Crimson & Amber Sparks */}
          <div className="duel-scene__embers">
            {DUEL_EMBERS.map(([left, delay, duration, drift, size, tone], index) => (
              <span
                key={index}
                className={`duel-scene__ember duel-scene__ember--${tone}`}
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

          {/* Layer 5: Foreground Weapons & Braziers */}
          <div className="duel-scene__props duel-scene__props--left">
            <Image
              src="/duel-scene/props-left.webp"
              alt=""
              width={472}
              height={660}
              sizes="(max-width: 1024px) 26vw, 20vw"
              className="duel-scene__props-img"
            />
            <span className="duel-scene__blade-glow" />
          </div>

          <div className="duel-scene__props duel-scene__props--right">
            <Image
              src="/duel-scene/props-right.webp"
              alt=""
              width={395}
              height={377}
              sizes="(max-width: 1024px) 24vw, 18vw"
              className="duel-scene__props-img"
            />
            <span className="duel-scene__brazier-glow" />
          </div>

          {/* Layer 6: Center Reading Focus (Ensures UI contrast is perfect) */}
          <div className="duel-scene__focus" />
        </div>
      </div>

      <div className="duel-scene__content">{children}</div>
      <div className="duel-scene__threshold" aria-hidden="true" />
    </div>
  );
}
