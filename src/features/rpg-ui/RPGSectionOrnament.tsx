import React from "react";
import Image from "next/image";
import { clsx } from "clsx";
import "./rpg-ui.css";

/** Crest that sits above a section title. Decorative: the title stays real text. */
export function RPGSectionOrnament({ width = 132, className }: { width?: number; className?: string }) {
  return (
    <Image
      src="/rpg-ui/ornaments/rpg-ornament-center.webp"
      alt=""
      aria-hidden="true"
      width={512}
      height={236}
      unoptimized
      className={clsx("mx-auto block h-auto", className)}
      style={{ width }}
    />
  );
}

/** Two columns that frame a wide section (hidden on narrow screens). Needs a `relative` parent. */
export function RPGSideOrnaments() {
  return (
    <>
      <span aria-hidden="true" className="rpg-side rpg-side--left" />
      <span aria-hidden="true" className="rpg-side rpg-side--right" />
    </>
  );
}
