"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dialog, RpgDownload, RpgShare, RpgSparkles } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { shareProfile } from "./shareProfile";
import { describeShareTarget, shareCardFilename, shareCardImagePath, type ShareTarget } from "./shareTarget";

interface ShareImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  target: ShareTarget;
}

type ImageState = { status: "loading" } | { status: "ready"; url: string } | { status: "failed" };

/**
 * Share or download the card of one achievement or Chronicle chapter. The card is the server-rendered PNG (the
 * same image the download delivers): it is fetched ONCE, shown as the preview and reused for the download, so
 * there is no second drawing implementation in the browser and no second request.
 */
export const ShareImageModal: React.FC<ShareImageModalProps> = ({ isOpen, onClose, username, target }) => {
  const { language } = useUiStore();
  const dictionary = getTranslation(language);
  const t = dictionary.shareCard;
  const texts = describeShareTarget(username, target, language);
  const imagePath = shareCardImagePath(username, target, language);
  const filename = shareCardFilename(username, target);

  const [image, setImage] = useState<ImageState>({ status: "loading" });
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setImage({ status: "loading" });
    setDownloadFailed(false);

    fetch(imagePath, { signal: controller.signal })
      .then(async (response) => {
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
  }, [isOpen, imagePath]);

  // Never leave a pending "Link copied!" timer behind when the modal closes.
  useEffect(
    () => () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    },
    []
  );

  const handleDownload = useCallback(() => {
    if (image.status !== "ready") return;
    try {
      const anchor = document.createElement("a");
      anchor.href = image.url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setDownloadFailed(false);
    } catch {
      setDownloadFailed(true);
    }
  }, [image, filename]);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setShareStatus("idle");
    try {
      const result = await shareProfile(texts.data);
      if (result === "copied") {
        setShareStatus("copied");
        statusTimerRef.current = setTimeout(() => setShareStatus("idle"), 2500);
      } else if (result === "failed") {
        setShareStatus("failed");
      }
      // "shared" needs no message (the system sheet already confirmed it); "cancelled" is not an error.
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={texts.dialogTitle}
      description={t.subtitle}
      closeLabel={dictionary.common.closeDialog}
      className="max-w-4xl"
    >
      <div className="space-y-4 py-2">
        <div className="w-full overflow-hidden border-2 border-rpg-border rounded-md flex justify-center items-center bg-black/80 p-2 sm:p-3">
          {image.status === "ready" ? (
            // The card is a blob of our own PNG route, so next/image has nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={texts.previewLabel}
              className="w-full h-auto max-w-[840px] aspect-[1200/630] shadow-pixel rounded"
            />
          ) : (
            <div className="w-full max-w-[840px] aspect-[1200/630] flex items-center justify-center bg-rpg-void rounded">
              <p
                role={image.status === "failed" ? "alert" : "status"}
                className="font-sans text-sm text-slate-300 text-center px-4"
              >
                {image.status === "failed" ? t.previewFailed : t.previewLoading}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          {/* Polite live region: announces "Link copied!" to screen readers too. */}
          <span role="status" aria-live="polite" className="text-xs text-amber-400 font-mono font-semibold">
            {shareStatus === "copied" && (
              <span className="flex items-center gap-1 animate-fade-in">
                <RpgSparkles className="w-3.5 h-3.5" />
                {t.copiedLink}
              </span>
            )}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              {dictionary.share.close}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleShare} disabled={isSharing} className="gap-2">
              <RpgShare className="w-4 h-4 text-amber-400" />
              <span>{t.shareAction}</span>
            </Button>
            <Button size="sm" variant="primary" onClick={handleDownload} disabled={image.status !== "ready"} className="gap-2">
              <RpgDownload className="w-4 h-4" />
              <span>{t.downloadImage}</span>
            </Button>
          </div>
        </div>

        {downloadFailed && (
          <p role="alert" className="text-xs text-slate-300 font-sans">
            {t.downloadFailed}
          </p>
        )}

        {shareStatus === "failed" && (
          <div role="alert" className="space-y-2 text-xs text-slate-300 font-sans">
            <p>{t.shareFailed}</p>
            <input
              readOnly
              value={texts.data.url}
              aria-label={t.linkLabel}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full bg-rpg-void border border-rpg-border px-3 py-2 font-mono text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
            />
          </div>
        )}
      </div>
    </Dialog>
  );
};
