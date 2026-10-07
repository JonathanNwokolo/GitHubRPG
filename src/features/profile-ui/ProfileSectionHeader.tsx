import React from "react";
import Image from "next/image";
import { clsx } from "clsx";
import "./profile-ui.css";

interface ProfileSectionHeaderProps {
  title: string;
  subtitle?: string;
  /** DOM id of the heading (for `aria-labelledby`). */
  id?: string;
  /**
   * ornate: centered, winged crest above the title, for the main chapters of the sheet.
   * quiet: left aligned with a thin rule, for sections inside a tab and sub-sections.
   */
  variant?: "ornate" | "quiet";
  /** Content on the right of a quiet header (counters, actions). */
  aside?: React.ReactNode;
  className?: string;
}

export function ProfileSectionHeader({
  title,
  subtitle,
  id,
  variant = "ornate",
  aside,
  className,
}: ProfileSectionHeaderProps) {
  if (variant === "quiet") {
    return (
      <header className={clsx("space-y-2", className)}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 id={id} className="pf-section-title text-sm sm:text-base">
              {title}
            </h2>
            {subtitle && <p className="mt-1 font-sans text-xs pf-muted sm:text-sm">{subtitle}</p>}
          </div>
          {aside}
        </div>
        <div aria-hidden="true" className="pf-rule" />
      </header>
    );
  }

  return (
    <header className={clsx("text-center", className)}>
      <Image
        src="/profile-ui/section-headers/profile-section-ornament.webp"
        alt=""
        aria-hidden="true"
        width={700}
        height={220}
        unoptimized
        className="mx-auto -mb-2 block h-auto w-[132px] sm:w-[164px]"
      />
      <h2 id={id} className="pf-section-title text-xs sm:text-base">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-2 max-w-xl font-sans text-xs pf-muted sm:text-sm">{subtitle}</p>
      )}
    </header>
  );
}
