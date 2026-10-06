import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type ProgressBarVariant = "xp" | "hp" | "mp" | "arcane" | "stat";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // Current value
  max?: number; // Max value (default 100)
  variant?: ProgressBarVariant;
  label?: string;
  showValueText?: boolean;
  valueFormatter?: (value: number, max: number) => string;
  size?: "sm" | "md" | "lg";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = "xp",
  label,
  showValueText = true,
  valueFormatter,
  size = "md",
  className,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  const variantBarColors: Record<ProgressBarVariant, string> = {
    xp: "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400",
    hp: "bg-gradient-to-r from-red-800 via-red-600 to-red-400",
    mp: "bg-gradient-to-r from-cyan-800 via-cyan-600 to-cyan-400",
    arcane: "bg-gradient-to-r from-purple-800 via-purple-600 to-fuchsia-400",
    stat: "bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-400",
  };

  const heightSizes: Record<string, string> = {
    // h-3 (12px) minus border-2 and p-0.5 leaves a 4px fill; the old h-2 left 0px (invisible bar)
    sm: "h-3",
    md: "h-3.5",
    lg: "h-5",
  };

  const displayText = valueFormatter
    ? valueFormatter(value, max)
    : `${Math.round(value)} / ${max}`;

  return (
    <div className={twMerge(clsx("w-full flex flex-col gap-1", className))} {...props}>
      {(label || showValueText) && (
        <div className="flex items-center justify-between text-xs font-sans">
          {label && <span className="font-bold text-slate-200 uppercase tracking-wider">{label}</span>}
          {showValueText && (
            <span className="text-amber-400 font-mono text-xs font-medium">{displayText}</span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || "Barra de progresso"}
        className={twMerge(
          clsx(
            "w-full bg-rpg-void border-2 border-rpg-border relative overflow-hidden shadow-inner p-0.5",
            heightSizes[size]
          )
        )}
      >
        <div
          className={twMerge(
            clsx(
              "h-full transition-all duration-300 ease-out shadow-sm",
              variantBarColors[variant]
            )
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
