import React from "react";
import Image from "next/image";
import { clsx } from "clsx";

interface ProfileDividerProps {
  /** Largest width in px. The rule keeps its proportion (it never gets thicker). */
  maxWidth?: number;
  className?: string;
}

/** Thin gold rule with a rune in the middle. Purely decorative: use it sparingly, between big blocks. */
export function ProfileDivider({ maxWidth = 520, className }: ProfileDividerProps) {
  return (
    <div aria-hidden="true" className={clsx("mx-auto w-full", className)} style={{ maxWidth }}>
      <Image
        src="/profile-ui/dividers/profile-divider.webp"
        alt=""
        width={1200}
        height={80}
        unoptimized
        className="block h-auto w-full"
      />
    </div>
  );
}
