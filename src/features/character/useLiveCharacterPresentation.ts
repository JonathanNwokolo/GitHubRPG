"use client";

import { useCallback, useEffect, useState } from "react";
import type { CharacterPresentationModel } from "@/game-v2/publicProjection";
import { parseV2PollPayload } from "@/game-v2/pollContract";

export const V2_POLL_DELAYS_MS = [4_000, 4_000, 8_000, 12_000, 16_000, 16_000] as const;
const MAX_RETRY_AFTER_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_POLL_DURATION_MS = 65_000;

export type V2PollStatus = "idle" | "polling" | "ready" | "partial" | "unavailable" | "timed_out" | "rate_limited" | "failed";

export interface LiveCharacterPresentation extends CharacterPresentationModel {
  pollStatus: V2PollStatus;
  retry: () => void;
}

function retryAfterMs(response: Response, payloadRetryAfterMs?: number): number | null {
  const headerSeconds = Number(response.headers.get("Retry-After"));
  const candidate = payloadRetryAfterMs ?? (Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds * 1_000 : null);
  return candidate === null ? null : Math.min(MAX_RETRY_AFTER_MS, Math.max(1_000, Math.round(candidate)));
}

function pollId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `poll-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useLiveCharacterPresentation(initial: CharacterPresentationModel, username: string): LiveCharacterPresentation {
  const [presentation, setPresentation] = useState(initial);
  const [status, setStatus] = useState<V2PollStatus>("idle");
  const [retryGeneration, setRetryGeneration] = useState(0);
  const retry = useCallback(() => setRetryGeneration((value) => value + 1), []);

  useEffect(() => {
    setPresentation(initial);
    const shouldPoll = initial.v2Enabled && (initial.delivery === "enriching" || initial.delivery === "stale");
    if (!shouldPoll) {
      setStatus(initial.v2 ? (initial.delivery === "partial" ? "partial" : "ready") : initial.v2Enabled ? "unavailable" : "idle");
      return;
    }

    const flowController = new AbortController();
    const correlationId = pollId();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestController: AbortController | undefined;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let hiddenPauses = 0;
    let waitingWhileHidden = false;
    let requestActive = false;
    let finished = false;
    const startedAt = performance.now();
    setStatus("polling");

    const finish = (next: V2PollStatus) => {
      if (flowController.signal.aborted || finished) return;
      finished = true;
      setStatus(next);
      console.info(JSON.stringify({ event: "v2_poll_summary", correlation_id: correlationId, result: next, attempts, elapsed_ms: Math.round(performance.now() - startedAt), hidden_pauses: hiddenPauses }));
    };
    const deadlineTimer = setTimeout(() => {
      requestController?.abort();
      finish("timed_out");
    }, MAX_POLL_DURATION_MS);

    const schedule = (overrideDelay?: number) => {
      if (flowController.signal.aborted || finished) return;
      if (attempts >= V2_POLL_DELAYS_MS.length) { finish("timed_out"); return; }
      if (document.visibilityState === "hidden") { waitingWhileHidden = true; hiddenPauses += 1; return; }
      waitingWhileHidden = false;
      const delay = overrideDelay ?? V2_POLL_DELAYS_MS[attempts];
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void poll(), delay);
    };

    const poll = async () => {
      if (flowController.signal.aborted || finished || requestActive) return;
      if (document.visibilityState === "hidden") { waitingWhileHidden = true; hiddenPauses += 1; return; }
      requestActive = true;
      attempts += 1;
      requestController = new AbortController();
      const abortFlowRequest = () => requestController?.abort();
      flowController.signal.addEventListener("abort", abortFlowRequest, { once: true });
      requestTimer = setTimeout(() => requestController?.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`/api/experimental/v2/characters/${encodeURIComponent(username)}`, {
          cache: "no-store",
          credentials: "omit",
          headers: { Accept: "application/json", "X-GitHubRPG-Poll-Id": correlationId, "X-GitHubRPG-Poll-Attempt": String(attempts) },
          signal: requestController.signal,
        });
        const body: unknown = await response.json().catch(() => null);
        const payload = parseV2PollPayload(body);
        if (response.status === 429) {
          const delay = retryAfterMs(response, payload?.retryAfterMs);
          if (delay !== null && attempts < V2_POLL_DELAYS_MS.length) schedule(delay);
          else finish("rate_limited");
          return;
        }
        if (response.status === 504) { finish("timed_out"); return; }
        if (!response.ok && response.status !== 202) {
          if (attempts >= V2_POLL_DELAYS_MS.length) finish("failed"); else schedule();
          return;
        }
        if (!payload) { finish("failed"); return; }
        if (payload.character) setPresentation({ v2Enabled: true, delivery: payload.state, v2: payload.character });
        if (payload.state === "ready" || payload.state === "partial") { finish(payload.state); return; }
        if (payload.state === "unavailable") {
          setPresentation({ v2Enabled: true, delivery: "unavailable", v2: null });
          finish("unavailable");
          return;
        }
        schedule(retryAfterMs(response, payload.retryAfterMs) ?? undefined);
      } catch (error) {
        if (flowController.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") finish("timed_out");
        else if (attempts >= V2_POLL_DELAYS_MS.length) finish("failed");
        else schedule();
      } finally {
        requestActive = false;
        if (requestTimer) clearTimeout(requestTimer);
        flowController.signal.removeEventListener("abort", abortFlowRequest);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (timer) { clearTimeout(timer); timer = undefined; waitingWhileHidden = true; hiddenPauses += 1; }
      } else if (waitingWhileHidden && !requestActive) schedule(0);
    };
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      flowController.abort();
      requestController?.abort();
      if (timer) clearTimeout(timer);
      if (requestTimer) clearTimeout(requestTimer);
      clearTimeout(deadlineTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [initial, retryGeneration, username]);

  return { ...presentation, pollStatus: status, retry };
}
