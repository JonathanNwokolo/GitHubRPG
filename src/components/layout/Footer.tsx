"use client";

import React from "react";
import Link from "next/link";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface FooterProps {
  /** True when the server is configured with the mock data source. Decided on the server. */
  isDemo: boolean;
}

const CREATOR_LINKS = [
  {
    href: "https://jonathannwokolo.com/",
    labelKey: "portfolio",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
  },
  {
    href: "https://github.com/JonathanNwokolo",
    labelKey: "github",
    icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  },
  {
    href: "https://github.com/JonathanNwokolo/GitHubRPG",
    labelKey: "sourceCode",
    icon: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  },
] as const;

export const Footer: React.FC<FooterProps> = ({ isDemo }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  return (
    <footer className="w-full bg-rpg-obsidian border-t-2 border-rpg-border mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-8 text-center md:text-left">
        <div className="flex flex-col gap-1.5 md:flex-1">
          <p className="font-sans font-bold text-xs sm:text-sm text-amber-400 tracking-wide uppercase">
            GitHub RPG
            {isDemo && (
              <>
                {" "}
                &bull; <span className="text-amber-300/90 font-semibold normal-case">{t.common.demoDataDisclaimer}</span>
              </>
            )}
          </p>
          <p className="font-sans text-xs text-slate-400 max-w-xl leading-relaxed">{t.disclaimer}</p>
          <p className="font-sans text-xs text-slate-500 max-w-xl leading-relaxed">
            {t.common.independentNotice}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1.5 font-sans text-xs sm:text-sm">
          <p className="text-slate-400">
            {t.footer.madeBy} <span className="font-semibold text-amber-300">Jonathan Nwokolo</span>
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 font-semibold text-slate-400">
            {CREATOR_LINKS.map(({ href, labelKey, icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold px-2 py-1 rounded"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                    className="shrink-0 opacity-80"
                  >
                    {icon}
                  </svg>
                  {t.footer[labelKey]}
                  <span className="sr-only"> ({t.footer.externalLink})</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 text-xs sm:text-sm font-sans font-semibold text-slate-400 md:flex-1 md:justify-end">
          <Link
            href="/settings"
            className="hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold px-2 py-1 rounded"
          >
            {t.nav.settings}
          </Link>
        </div>
      </div>
    </footer>
  );
};
