"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { playClickSound } from "@/lib/audio/soundEffects";

export type ButtonVariant = "primary" | "secondary" | "arcane" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  playAudio?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      playAudio = true,
      className,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-sans font-bold tracking-wider uppercase transition-all duration-150 select-none " +
      "border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-rpg-goldDark hover:bg-rpg-gold text-slate-950 border-amber-300 font-extrabold shadow-pixel hover:shadow-pixel-gold focus-visible:ring-rpg-gold",
      secondary:
        "bg-rpg-surface hover:bg-rpg-surfaceLight text-slate-100 border-rpg-border hover:border-rpg-borderLight shadow-pixel focus-visible:ring-slate-400",
      arcane:
        "bg-rpg-arcaneDark hover:bg-rpg-arcane text-white border-purple-400 shadow-pixel hover:shadow-pixel-arcane focus-visible:ring-rpg-arcane",
      danger:
        "bg-rpg-crimsonDark hover:bg-rpg-crimson text-white border-red-400 shadow-pixel hover:shadow-pixel-crimson focus-visible:ring-rpg-crimson",
      ghost:
        "bg-transparent hover:bg-rpg-surface/80 text-slate-200 border-transparent hover:border-rpg-border focus-visible:ring-rpg-gold",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "text-xs px-3 py-1.5 gap-1.5 min-h-[36px]",
      md: "text-xs sm:text-sm px-4 py-2.5 gap-2 min-h-[44px]",
      lg: "text-sm sm:text-base px-6 py-3.5 gap-2.5 min-h-[52px]",
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        if (playAudio) playClickSound();
        onClick?.(e);
      }
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        onClick={handleClick}
        className={twMerge(clsx(baseStyles, variantStyles[variant], sizeStyles[size], className))}
        {...props}
      >
        {isLoading && (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
