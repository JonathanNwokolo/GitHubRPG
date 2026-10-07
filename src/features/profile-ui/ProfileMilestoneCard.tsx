import React from "react";
import { clsx } from "clsx";
import "./profile-ui.css";

/** A "next milestone" on the kit's carved frame. The frame is the border; the content keeps its own padding. */
export function ProfileMilestoneCard({ className, children, ...rest }: React.LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li {...rest} className={clsx("pf-milestone", className)}>
      {children}
    </li>
  );
}
