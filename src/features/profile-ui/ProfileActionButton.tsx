import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { playClickSound } from "@/lib/audio/soundEffects";
import "./profile-ui.css";

/** primary: aged gold. secondary: iron. duel: ruby, the gameplay call to action. small: quiet utilities. */
export type ProfileActionVariant = "primary" | "secondary" | "duel" | "small";

interface ProfileActionBaseProps {
  variant?: ProfileActionVariant;
  className?: string;
  children: React.ReactNode;
}

type ProfileActionLinkProps = ProfileActionBaseProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children"> & { href: string };

type ProfileActionButtonProps = ProfileActionBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
    ref?: React.Ref<HTMLButtonElement>;
  };

export type ProfileActionProps = ProfileActionLinkProps | ProfileActionButtonProps;

/** Kit button for the character sheet. The label is real, translatable text; the image only paints the plate. */
export function ProfileActionButton(props: ProfileActionProps) {
  if (props.href !== undefined) {
    const { variant = "primary", className, children, ...linkProps } = props;
    return (
      <Link {...linkProps} className={clsx("pf-btn", `pf-btn--${variant}`, className)}>
        {children}
      </Link>
    );
  }

  const { variant = "primary", className, children, onClick, ...buttonProps } = props;
  return (
    <button
      type="button"
      {...buttonProps}
      className={clsx("pf-btn", `pf-btn--${variant}`, className)}
      onClick={(event) => {
        if (!buttonProps.disabled) playClickSound();
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
