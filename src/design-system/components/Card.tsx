import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type CardVariant = "default" | "interactive" | "rune" | "highlighted";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  rarity,
  className,
  children,
  ...props
}) => {
  const baseStyles = "relative bg-rpg-obsidian border-2 text-rpg-parchment transition-all duration-200";

  const variantStyles: Record<CardVariant, string> = {
    default: "border-rpg-border p-4 shadow-pixel",
    interactive:
      "border-rpg-border hover:border-rpg-borderLight p-4 shadow-pixel hover:-translate-y-1 hover:shadow-lg cursor-pointer",
    rune: "border-rpg-borderLight bg-gradient-to-b from-rpg-surface to-rpg-obsidian p-5 shadow-pixel",
    highlighted: "border-rpg-goldDark bg-rpg-surface p-5 shadow-pixel-gold",
  };

  const rarityBorders: Record<string, string> = {
    common: "border-slate-500",
    rare: "border-sky-400 shadow-pixel-azure",
    epic: "border-purple-400 shadow-pixel-arcane",
    legendary: "border-amber-400 shadow-pixel-gold",
  };

  return (
    <div
      className={twMerge(
        clsx(
          baseStyles,
          variantStyles[variant],
          rarity && rarityBorders[rarity],
          className
        )
      )}
      {...props}
    >
      {/* Corner pixel decors */}
      <span className="absolute -top-[3px] -left-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" />
      <span className="absolute -top-[3px] -right-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" />
      <span className="absolute -bottom-[3px] -left-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" />
      <span className="absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] bg-rpg-borderLight pointer-events-none" />
      {children}
    </div>
  );
};
