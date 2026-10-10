"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dialog, RpgDownload, RpgGlobe, RpgShare, RpgTome } from "@/design-system";
import { fill } from "@/lib/format";
import { profileUrl } from "@/lib/profileUrl";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { copyToClipboard } from "./shareProfile";
import {
  buildSharePostText,
  linkedInShareUrl,
  socialCardFilename,
  socialCardImagePath,
} from "./socialPost";

interface HeroShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  /** What the sheet shows for the hero, so the post says the same as the card. */
  heroClassName: string;
  /** null when the level is not publishable: the post leaves the line out. */
  level: number | null;
  /** null when no title is equipped: the post leaves the line out. */
  title: string | null;
  /** Id of the equipped title (sent to the card route, which validates it against the hero's unlocked titles). */
  titleId?: string;
}

type ImageState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "unavailable" }
  | { status: "pending" }
  | { status: "failed" };

type Feedback = { kind: "post" | "link"; result: "copied" | "failed" } | null;

/**
 * "Share Hero": the Hero Social Card (the server-rendered PNG, fetched ONCE and used both as the preview and as the
 * file that is downloaded, so what is shown is exactly what is exported), plus the link and the post text.
 *
 * LinkedIn can only be handed the link: its web share has no way to receive a local image, so the dialog says
 * plainly that the PNG is attached by hand.
 */
export const HeroShareDialog: React.FC<HeroShareDialogProps> = ({
  isOpen,
  onClose,
  username,
  heroClassName,
  level,
  title,
  titleId,
}) => {
  const { language } = useUiStore();
  const dictionary = getTranslation(language);
  const t = dictionary.heroShare;

  const imagePath = socialCardImagePath(username, language, titleId);
  const sheetUrl = profileUrl(username);
  const postText = buildSharePostText({ language, className: heroClassName, level, title, url: sheetUrl });

  const [image, setImage] = useState<ImageState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setImage({ status: "loading" });
    setDownloadFailed(false);

    fetch(imagePath, { signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (response.status === 503) {
          // The route answers 503 either way; a Retry-After header marks "still being prepared".
          setImage(response.headers.get("Retry-After") ? { status: "pending" } : { status: "unavailable" });
          return;
        }
        if (!response.ok) throw new Error(`card ${response.status}`);
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ status: "ready", url: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setImage({ status: "failed" });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, imagePath, attempt]);

  // Never leave a pending "copied" timer behind when the dialog closes.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const announce = useCallback((next: Feedback) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback(next);
    if (next?.result === "copied") timerRef.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

  const copy = async (kind: "post" | "link") => {
    const copied = await copyToClipboard(kind === "post" ? postText : sheetUrl);
    announce({ kind, result: copied ? "copied" : "failed" });
  };

  const download = () => {
    if (image.status !== "ready") return;
    try {
      const anchor = document.createElement("a");
      anchor.href = image.url;
      anchor.download = socialCardFilename(username);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setDownloadFailed(false);
    } catch {
      setDownloadFailed(true);
    }
  };

  const openLinkedIn = () => {
    window.open(linkedInShareUrl(sheetUrl), "_blank", "noopener,noreferrer");
  };

  const ready = image.status === "ready";
  const message = (() => {
    if (image.status === "unavailable") return t.previewUnavailable;
    if (image.status === "pending") return t.previewPending;
    if (image.status === "failed") return t.previewFailed;
    return t.previewLoading;
  })();

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t.dialogTitle}
      description={t.dialogSubtitle}
      closeLabel={dictionary.common.closeDialog}
      className="max-w-4xl"
    >
      <div className="grid gap-5 py-2 md:grid-cols-[auto_minmax(0,1fr)] md:gap-6">
        {/* The card, 4:5. Its box is reserved before the image arrives, so nothing jumps. */}
        <div className="flex justify-center md:justify-start">
          <div className="aspect-[4/5] w-full max-w-[300px] overflow-hidden rounded border-2 border-rpg-border bg-black/80 shadow-pixel md:h-[min(62vh,540px)] md:w-auto md:max-w-none">
            {ready ? (
              // The card is a blob of our own PNG route, so next/image has nothing to optimise.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={fill(t.previewLabel, { username })}
                width={1080}
                height={1350}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
                <p
                  role={image.status === "loading" ? "status" : "alert"}
                  className="font-sans text-sm leading-relaxed text-slate-300"
                >
                  {message}
                </p>
                {(image.status === "failed" || image.status === "pending") && (
                  <Button size="sm" variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
                    {t.retry}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div role="group" aria-label={t.actionsLabel} className="flex flex-col gap-2.5">
            <Button variant="primary" onClick={download} disabled={!ready} className="w-full gap-2">
              <RpgDownload className="h-4 w-4" aria-hidden="true" />
              <span>{t.downloadPng}</span>
            </Button>
            <Button variant="secondary" onClick={() => copy("post")} className="w-full gap-2">
              <RpgTome className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>{t.copyPost}</span>
            </Button>
            <Button variant="secondary" onClick={() => copy("link")} className="w-full gap-2">
              <RpgGlobe className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>{t.copyLink}</span>
            </Button>
            <Button
              variant="secondary"
              onClick={openLinkedIn}
              aria-describedby="hero-share-linkedin-hint"
              className="w-full gap-2"
            >
              <RpgShare className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>{t.shareLinkedIn}</span>
            </Button>
          </div>

          <p id="hero-share-linkedin-hint" className="font-sans text-xs leading-relaxed text-slate-400">
            {t.linkedInHint}
          </p>

          {/* Polite live region: announces "Link copied" to screen readers too. */}
          <p role="status" aria-live="polite" className="min-h-[1.25rem] font-mono text-xs font-semibold text-amber-400">
            {feedback?.result === "copied" && (feedback.kind === "link" ? t.linkCopied : t.postCopied)}
          </p>

          {downloadFailed && (
            <p role="alert" className="font-sans text-xs text-slate-300">
              {t.downloadFailed}
            </p>
          )}

          {feedback?.result === "failed" && (
            <div role="alert" className="space-y-2 font-sans text-xs text-slate-300">
              <p>{t.copyFailed}</p>
              <textarea
                readOnly
                rows={feedback.kind === "post" ? 8 : 2}
                value={feedback.kind === "post" ? postText : sheetUrl}
                aria-label={feedback.kind === "post" ? t.postFieldLabel : t.linkFieldLabel}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full resize-none border border-rpg-border bg-rpg-void px-3 py-2 font-mono text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
              />
            </div>
          )}

          <p className="font-mono text-[11px] text-slate-500">{t.resolution}</p>
        </div>
      </div>
    </Dialog>
  );
};
