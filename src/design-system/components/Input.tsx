"use client";

import React, { InputHTMLAttributes, forwardRef, useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="font-sans font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-rpg-parchmentMuted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={twMerge(
              clsx(
                "w-full bg-rpg-obsidian border-2 font-sans text-sm text-slate-100 placeholder:text-slate-400",
                "px-4 py-3 min-h-[46px] transition-colors duration-150 shadow-inner",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void",
                leftIcon ? "pl-11" : "pl-4",
                rightIcon ? "pr-11" : "pr-4",
                error
                  ? "border-rpg-crimson focus-visible:border-rpg-crimson focus-visible:ring-rpg-crimson"
                  : "border-rpg-border focus-visible:border-rpg-gold focus-visible:ring-rpg-gold",
                disabled && "opacity-50 cursor-not-allowed bg-slate-900",
                className
              )
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-rpg-parchmentMuted flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="font-sans text-xs text-rpg-crimson font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="font-sans text-xs text-rpg-parchmentMuted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
