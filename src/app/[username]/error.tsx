"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorState, RpgArrowLeft } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface CharacterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Boundary for unexpected failures while loading a sheet (GitHub down, timeout, rate limit, internal error).
 * An unknown profile never lands here: the page calls notFound() and gets the real 404.
 *
 * It deliberately shows only friendly text. The error message and stack stay out of the page (Next
 * already logs them on the server); the opaque `digest` is shown as a reference so a failure can be found in the logs.
 */
export default function CharacterError({ error, reset }: CharacterErrorProps) {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();
  const { language } = useUiStore();
  const t = getTranslation(language);

  // The sheet is rendered on the server: reset() alone would only re-render the client tree, so refresh
  // the route to run the server fetch again.
  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center">
      <ErrorState
        title={t.errorPage.title}
        message={t.errorPage.message}
        retryLabel={t.common.retry}
        onRetry={isRetrying ? undefined : handleRetry}
        className="max-w-xl"
      />
      {error.digest && (
        <p className="font-mono text-[11px] text-slate-500">
          {t.errorPage.reference}: {error.digest}
        </p>
      )}
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 font-sans font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-100 bg-rpg-surface hover:bg-rpg-surfaceLight border-2 border-rpg-border hover:border-rpg-borderLight shadow-pixel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void"
      >
        <RpgArrowLeft className="w-4 h-4" />
        <span>{t.common.backHome}</span>
      </Link>
    </div>
  );
}
