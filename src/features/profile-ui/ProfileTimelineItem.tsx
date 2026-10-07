import React from "react";
import { clsx } from "clsx";
import "./profile-ui.css";

/** How much the entry weighs on the journey. Presentation only; the data decides (see the Chronicle). */
export type ProfileTimelineKind = "common" | "important" | "current";

/** Entries beyond this share one animation delay, so a long journey never makes the reader wait. */
const MAX_STAGGER_STEPS = 8;
const STAGGER_MS = 60;

export function staggerStyle(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` };
}

interface ProfileTimelineItemProps {
  kind: ProfileTimelineKind;
  isFirst: boolean;
  isLast: boolean;
  index: number;
  /** The date or year. Beside the marker on wide screens, above the content on phones. */
  year: React.ReactNode;
  children: React.ReactNode;
}

/**
 * One stop of the campaign timeline: date, marker on the spine, content.
 * The spine is drawn per entry so it stays continuous without measuring anything, and never crosses the text.
 */
export function ProfileTimelineItem({ kind, isFirst, isLast, index, year, children }: ProfileTimelineItemProps) {
  return (
    <li
      className={clsx(
        "pf-tl animate-fade-rise",
        `pf-tl--${kind}`,
        isFirst && "pf-tl--first",
        isLast && "pf-tl--last"
      )}
      style={staggerStyle(index)}
    >
      <span aria-hidden="true" className="pf-tl__rail">
        <span className="pf-tl__line" />
        <span className="pf-tl__marker" />
      </span>
      <div className="pf-tl__year">{year}</div>
      <div className="pf-tl__body">{children}</div>
    </li>
  );
}
