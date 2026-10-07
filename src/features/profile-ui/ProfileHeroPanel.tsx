import React from "react";
import { clsx } from "clsx";
import "./profile-ui.css";

interface ProfileHeroPanelProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/**
 * Chassis of the character sheet header. The kit art (corners and crest) is cropped from one image at a fixed
 * scale, so nothing is stretched; the plate behind the content is CSS. The content stays real, responsive HTML.
 */
export function ProfileHeroPanel({ className, children, ...rest }: ProfileHeroPanelProps) {
  return (
    <section {...rest} className={clsx("pf-hero", className)}>
      <span aria-hidden="true" className="pf-hero__edge" />
      <span aria-hidden="true" className="pf-hero__sprite pf-hero__corner pf-hero__corner--tl" />
      <span aria-hidden="true" className="pf-hero__sprite pf-hero__corner pf-hero__corner--tr" />
      <span aria-hidden="true" className="pf-hero__sprite pf-hero__corner pf-hero__corner--bl" />
      <span aria-hidden="true" className="pf-hero__sprite pf-hero__corner pf-hero__corner--br" />
      <span aria-hidden="true" className="pf-hero__sprite pf-hero__crest" />
      <span aria-hidden="true" className="pf-hero__sprite pf-hero__tip" />
      <div className="pf-hero__content">{children}</div>
    </section>
  );
}
