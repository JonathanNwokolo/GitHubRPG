import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Consultando os oráculos do código...",
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={twMerge(
        clsx(
          "w-full flex flex-col items-center justify-center p-12 text-center text-rpg-parchment",
          className
        )
      )}
    >
      <div className="relative w-12 h-12 mb-4">
        {/* Pixel spinning runes */}
        <div className="absolute inset-0 border-4 border-rpg-border border-t-rpg-gold animate-spin" />
        <div className="absolute inset-2 border-2 border-rpg-borderLight border-b-rpg-arcane animate-spin [animation-direction:reverse]" />
      </div>
      <p className="font-sans font-semibold text-sm sm:text-base text-amber-400 tracking-wide">{message}</p>
      <span className="sr-only">Carregando conteúdo</span>
    </div>
  );
};
