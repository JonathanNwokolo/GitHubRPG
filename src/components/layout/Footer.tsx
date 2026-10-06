"use client";

import React from "react";
import Link from "next/link";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface FooterProps {
  /** True when the server is configured with the mock data source. Decided on the server. */
  isDemo: boolean;
}

export const Footer: React.FC<FooterProps> = ({ isDemo }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  return (
    <footer className="w-full bg-rpg-obsidian border-t-2 border-rpg-border mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex flex-col gap-1.5">
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
            Aplicação lúdica independente. Não possui afiliação oficial com GitHub, Inc.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs sm:text-sm font-sans font-semibold text-slate-400">
          <Link
            href="/design-system"
            className="hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold px-2 py-1 rounded"
          >
            {t.nav.designSystem}
          </Link>
          <span className="text-slate-600">&bull;</span>
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
