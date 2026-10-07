import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { playClickSound } from "@/lib/audio/soundEffects";
import "./rpg-ui.css";

export type RPGButtonVariant = "primary" | "duel";
export type RPGButtonSize = "sm" | "md" | "lg";

interface RPGButtonBaseProps {
  /** "primary": aged gold, the secondary action. "duel": ruby and iron, the gameplay call to action. */
  variant?: RPGButtonVariant;
  size?: RPGButtonSize;
  className?: string;
  children: React.ReactNode;
}

type RPGButtonLinkProps = RPGButtonBaseProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children"> & { href: string };

type RPGButtonButtonProps = RPGButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

export type RPGButtonProps = RPGButtonLinkProps | RPGButtonButtonProps;

/** Kit button. The label is real, translatable text; the image only paints the plate behind it. */
export function RPGButton(props: RPGButtonProps) {
  if (props.href !== undefined) {
    const { variant = "primary", size = "md", className, children, ...linkProps } = props;
    return (
      <Link {...linkProps} className={clsx("rpg-btn", `rpg-btn--${variant}`, `rpg-btn--${size}`, className)}>
        {children}
      </Link>
    );
  }

  const { variant = "primary", size = "md", className, children, onClick, ...buttonProps } = props;
  return (
    <button
      type="button"
      {...buttonProps}
      className={clsx("rpg-btn", `rpg-btn--${variant}`, `rpg-btn--${size}`, className)}
      onClick={(event) => {
        if (!buttonProps.disabled) playClickSound();
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
