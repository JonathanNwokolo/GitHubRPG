"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Dialog, RpgSparkles } from "@/design-system";
import { getTranslation } from "@/i18n";
import { profileBadgePath } from "@/lib/profileUrl";
import { useUiStore } from "@/stores/useUiStore";
import { copyToClipboard } from "@/features/share/shareProfile";
import { readmeBadgeMarkdown } from "./readmeMarkdown";

interface ReadmeBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

/** "Add to README": the badge preview and the Markdown that embeds it, ready to copy. */
export const ReadmeBadgeModal: React.FC<ReadmeBadgeModalProps> = ({ isOpen, onClose, username }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).readme;
  const closeLabel = getTranslation(language).common.closeDialog;

  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markdown = readmeBadgeMarkdown(username);

  // Never leave a pending "Copied!" timer behind when the modal closes.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const copied = await copyToClipboard(markdown);
    setStatus(copied ? "copied" : "failed");
    if (copied) timerRef.current = setTimeout(() => setStatus("idle"), 2500);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t.title} description={t.subtitle} closeLabel={closeLabel}>
      <div className="space-y-4 py-1">
        <div className="flex justify-center items-center min-h-[56px] bg-black/60 border border-rpg-border p-3 overflow-x-auto">
          {/* The badge is an SVG served by our own route, so next/image has nothing to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profileBadgePath(username)} alt={t.previewLabel} height={26} className="h-[26px] w-auto max-w-none" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="readme-badge-markdown" className="block font-sans text-xs font-bold text-slate-200">
            {t.markdownLabel}
          </label>
          <textarea
            id="readme-badge-markdown"
            readOnly
            rows={3}
            value={markdown}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full resize-none bg-rpg-void border border-rpg-border px-3 py-2 font-mono text-xs text-slate-200 break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
          />
        </div>

        <p className="font-sans text-xs text-slate-400">{t.hint}</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Polite live region: announces the result to screen readers too. */}
          <span role="status" aria-live="polite" className="text-xs text-amber-400 font-mono font-semibold">
            {status === "copied" && (
              <span className="flex items-center gap-1 animate-fade-in">
                <RpgSparkles className="w-3.5 h-3.5" />
                {t.copied}
              </span>
            )}
          </span>
          <Button size="sm" variant="primary" onClick={handleCopy}>
            {t.copy}
          </Button>
        </div>

        {status === "failed" && (
          <p role="alert" className="font-sans text-xs text-slate-300">
            {t.copyFailed}
          </p>
        )}
      </div>
    </Dialog>
  );
};
