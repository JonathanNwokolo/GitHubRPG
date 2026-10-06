import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type BadgeVariant =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "gold"
  | "arcane"
  | "crimson"
  | "azure"
  | "emerald"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-bold tracking-wider uppercase select-none border whitespace-nowrap";

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  const variantStyles: Record<BadgeVariant, string> = {
    common: "bg-slate-900/90 text-slate-200 border-slate-500 shadow-sm",
    rare: "bg-sky-950/90 text-sky-200 border-sky-400 shadow-sm shadow-sky-900/50",
    epic: "bg-purple-950/90 text-purple-200 border-purple-400 shadow-sm shadow-purple-900/50",
    legendary: "bg-amber-950/90 text-amber-200 border-amber-400 shadow-sm shadow-amber-900/50 font-extrabold",
    gold: "bg-amber-950/80 text-amber-300 border-amber-400",
    arcane: "bg-purple-950/80 text-purple-200 border-purple-400",
    crimson: "bg-red-950/80 text-red-200 border-red-500",
    azure: "bg-cyan-950/80 text-cyan-200 border-cyan-400",
    emerald: "bg-emerald-950/80 text-emerald-200 border-emerald-400",
    neutral: "bg-rpg-surface text-slate-200 border-rpg-border",
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
};
