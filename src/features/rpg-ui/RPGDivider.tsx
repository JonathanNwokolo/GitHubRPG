import React from "react";
import Image from "next/image";
import { clsx } from "clsx";

interface RPGDividerProps {
  /** Largest width in px. The divider keeps its proportion (it never gets thicker). */
  maxWidth?: number;
  className?: string;
}

/** Ornamental gold rule between sections of a card or screen. Purely decorative. */
export function RPGDivider({ maxWidth = 380, className }: RPGDividerProps) {
  return (
    <div aria-hidden="true" className={clsx("mx-auto w-full", className)} style={{ maxWidth }}>
      <Image
        src="/rpg-ui/dividers/rpg-divider-gold.webp"
        alt=""
        width={1024}
        height={100}
        unoptimized
        className="block h-auto w-full"
      />
    </div>
  );
}
