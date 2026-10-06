"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

const BADGE_PREWARM_TIMEOUT_MS = 45_000;

type PrewarmStatus = "idle" | "preparing" | "ready" | "failed";

/** "Add to README": the badge preview and the Markdown that embeds it, ready to copy. */
export const ReadmeBadgeModal: React.FC<ReadmeBadgeModalProps> = ({ isOpen, onClose, username }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).readme;
  const closeLabel = getTranslation(language).common.closeDialog;

  const [prewarmStatus, setPrewarmStatus] = useState<PrewarmStatus>("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prewarmPromiseRef = useRef<Promise<void> | null>(null);
  const prewarmControllerRef = useRef<AbortController | null>(null);
  const isPrewarmedRef = useRef(false);
  const markdown = readmeBadgeMarkdown(username);
  const badgePath = profileBadgePath(username);

  const prewarmBadge = useCallback((): Promise<void> => {
    if (isPrewarmedRef.current) return Promise.resolve();
    if (prewarmPromiseRef.current) return prewarmPromiseRef.current;

    const controller = new AbortController();
    prewarmControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), BADGE_PREWARM_TIMEOUT_MS);
    const request = (async () => {
      const response = await fetch(badgePath, { credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error("Badge prewarm failed");
      // `fetch` resolves as soon as headers arrive. Consume the tiny SVG so "ready" means the response completed.
      await response.arrayBuffer();
      isPrewarmedRef.current = true;
    })().finally(() => {
      clearTimeout(timeout);
      if (prewarmPromiseRef.current === request) prewarmPromiseRef.current = null;
      if (prewarmControllerRef.current === controller) prewarmControllerRef.current = null;
    });

    prewarmPromiseRef.current = request;
    return request;
  }, [badgePath]);

  const runPrewarm = useCallback(() => {
    setPrewarmStatus("preparing");
    void prewarmBadge().then(
      () => setPrewarmStatus("ready"),
      () => setPrewarmStatus("failed")
    );
  }, [prewarmBadge]);

  useEffect(() => {
    if (isOpen) runPrewarm();
  }, [isOpen, runPrewarm]);

  // Never leave a pending "Copied!" timer behind when the modal closes.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      prewarmControllerRef.current?.abort();
    },
    []
  );

  const handleCopy = async () => {
    if (prewarmStatus !== "ready") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const copied = await copyToClipboard(markdown);
    setCopyStatus(copied ? "copied" : "failed");
    if (copied) timerRef.current = setTimeout(() => setCopyStatus("idle"), 2500);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t.title} description={t.subtitle} closeLabel={closeLabel}>
      <div className="space-y-4 py-1">
        <div
          role="status"
          aria-live="polite"
          className="min-h-[56px] bg-black/60 border border-rpg-border p-3 text-center"
        >
          {prewarmStatus === "preparing" && (
            <div className="space-y-1 font-sans">
              <p className="text-sm font-bold text-amber-300">{t.preparing}</p>
              <p className="text-xs text-slate-400">{t.preparingDetail}</p>
            </div>
          )}
          {prewarmStatus === "ready" && (
            <div className="space-y-3">
              <p className="font-sans text-xs font-bold text-emerald-300">{t.ready}</p>
              <div className="flex justify-center items-center overflow-x-auto">
                {/* The badge is an SVG served by our own route, so next/image has nothing to optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgePath} alt={t.previewLabel} height={26} className="h-[26px] w-auto max-w-none" />
              </div>
            </div>
          )}
          {prewarmStatus === "failed" && (
            <div className="space-y-3">
              <p role="alert" className="font-sans text-xs text-slate-300">
                {t.prepareFailed}
              </p>
              <Button size="sm" variant="secondary" onClick={runPrewarm}>
                {t.retry}
              </Button>
            </div>
          )}
        </div>

        {prewarmStatus === "ready" && (
          <>
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
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Polite live region: announces the result to screen readers too. */}
          <span role="status" aria-live="polite" className="text-xs text-amber-400 font-mono font-semibold">
            {copyStatus === "copied" && (
              <span className="flex items-center gap-1 animate-fade-in">
                <RpgSparkles className="w-3.5 h-3.5" />
                {t.copied}
              </span>
            )}
          </span>
          <Button size="sm" variant="primary" onClick={handleCopy} disabled={prewarmStatus !== "ready"}>
            {t.copy}
          </Button>
        </div>

        {copyStatus === "failed" && (
          <p role="alert" className="font-sans text-xs text-slate-300">
            {t.copyFailed}
          </p>
        )}
      </div>
    </Dialog>
  );
};
