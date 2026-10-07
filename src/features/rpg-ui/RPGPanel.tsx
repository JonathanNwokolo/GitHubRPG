import React from "react";
import { clsx } from "clsx";
import { RPGCorners, type RPGCornerVariant } from "./RPGCorners";
import "./rpg-ui.css";

interface RPGPanelProps extends React.HTMLAttributes<HTMLElement> {
  /** Corner set: "legendary" for the one hero piece of a screen, "standard" for the rest. */
  variant?: RPGCornerVariant;
  /** Lifts and lights up on hover/focus-within (motion is skipped for reduced-motion users). */
  interactive?: boolean;
  as?: "div" | "article" | "section";
}

/** Dark-fantasy card surface with the kit corners. Content goes in as children. */
export function RPGPanel({
  variant = "standard",
  interactive = false,
  as: Tag = "div",
  className,
  children,
  ...rest
}: RPGPanelProps) {
  return (
    <Tag
      {...rest}
      className={clsx(
        "rpg-panel",
        variant === "legendary" && "rpg-panel--legendary",
        interactive && "rpg-panel--interactive",
        className
      )}
    >
      {children}
      <RPGCorners variant={variant} />
    </Tag>
  );
}
