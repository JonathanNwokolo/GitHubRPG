"use client";

import React, { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PixelX } from "../icons/PixelIcons";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element inside modal
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        aria-describedby={description ? "dialog-description" : undefined}
        onClick={(e) => e.stopPropagation()}
        className={twMerge(
          clsx(
            "relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-rpg-obsidian border-2 border-rpg-border p-5 sm:p-6 shadow-2xl text-rpg-parchment",
            "focus:outline-none",
            className
          )
        )}
      >
        {/* Pixel corners */}
        <span className="absolute -top-[3px] -left-[3px] w-2 h-2 bg-rpg-gold pointer-events-none" />
        <span className="absolute -top-[3px] -right-[3px] w-2 h-2 bg-rpg-gold pointer-events-none" />
        <span className="absolute -bottom-[3px] -left-[3px] w-2 h-2 bg-rpg-gold pointer-events-none" />
        <span className="absolute -bottom-[3px] -right-[3px] w-2 h-2 bg-rpg-gold pointer-events-none" />

        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-rpg-border/60">
          <div>
            {title && (
              <h2 id="dialog-title" className="font-sans font-bold text-base sm:text-lg text-amber-400 tracking-wide">
                {title}
              </h2>
            )}
            {description && (
              <p id="dialog-description" className="font-sans text-xs sm:text-sm text-slate-300 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="text-slate-400 hover:text-white p-1.5 hover:bg-rpg-surface border border-transparent hover:border-rpg-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0"
          >
            <PixelX className="w-4 h-4" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
