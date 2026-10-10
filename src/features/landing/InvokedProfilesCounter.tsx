"use client";

import React, { useEffect, useState } from "react";
import { fetchInvokedProfileCount } from "@/data/api/fetchStats";
import { getTranslation } from "@/i18n";
import { fill, formatNumber } from "@/lib/format";
import { useUiStore } from "@/stores/useUiStore";

/** Below this the number is more modest than persuasive: the line stays hidden (no seeded or invented figure). */
export const MIN_INVOKED_PROFILES_TO_SHOW = 25;

/**
 * Discreet social proof: how many different GitHub profiles had a sheet summoned. Loaded after mount so the Home never
 * waits for it; while loading, on failure or below the threshold it renders nothing but keeps its row height.
 */
export const InvokedProfilesCounter: React.FC = () => {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchInvokedProfileCount(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setTotal(value);
      })
      .catch(() => {
        /* decorative: stay hidden */
      });
    return () => controller.abort();
  }, []);

  const visible = total !== null && total >= MIN_INVOKED_PROFILES_TO_SHOW;

  return (
    <div className="mt-1 flex min-h-5 items-center justify-center">
      {visible ? (
        <p className="inline-flex animate-fade-rise items-center gap-2 font-sans text-xs text-amber-200/80">
          <span aria-hidden="true" className="text-amber-400">✦</span>
          <span>{fill(t.landing.invokedProfiles, { count: formatNumber(total, language) })}</span>
        </p>
      ) : null}
    </div>
  );
};
