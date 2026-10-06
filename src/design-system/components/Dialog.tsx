"use client";

import React, { useEffect, useId, useRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RpgClose } from "../icons/RpgIcons";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Accessible name of the close button (callers pass the translated text). */
  closeLabel?: string;
}

/** Elements the Tab key can reach inside the dialog. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  closeLabel = "Fechar janela",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // The latest onClose, read by the key handler without re-running the open/close effect below
  // (callers pass a new inline function on every render, which used to steal focus back to the first button).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    // Remember what opened the dialog so focus can go back to it, and freeze the page behind it.
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap: Tab and Shift+Tab cycle inside the dialog.
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    (getFocusable()[0] ?? dialogRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

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
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
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
              <h2 id={titleId} className="font-sans font-bold text-base sm:text-lg text-amber-400 tracking-wide">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="font-sans text-xs sm:text-sm text-slate-300 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="text-slate-400 hover:text-amber-400 p-1.5 bg-rpg-surface hover:bg-rpg-surfaceLight border border-rpg-border hover:border-rpg-gold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
          >
            <RpgClose className="w-4 h-4" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
