"use client";

import { useEffect, useState } from "react";
import type {
  CharacterPresentationModel,
  RPGCharacterV2Public,
} from "@/game-v2/publicProjection";
import type { V2DeliveryState } from "@/game-v2/delivery";

// Cover the 55-second server enrichment budget without hammering the GitHub-backed endpoint.
const POLL_DELAYS_MS = [4_000, 4_000, 8_000, 12_000, 16_000, 16_000] as const;
const DELIVERY_STATES = new Set<V2DeliveryState>([
  "ready",
  "stale",
  "enriching",
  "partial",
  "unavailable",
]);

interface V2PollPayload {
  state: V2DeliveryState;
  character: RPGCharacterV2Public | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPublicCharacter(value: unknown): value is RPGCharacterV2Public {
  if (!isRecord(value) || value.engineVersion !== "2.0-experimental-v24-evo") return false;
  if (!isRecord(value.identity) || !isRecord(value.grimoire) || !isRecord(value.explanation)) return false;
  return Array.isArray(value.grimoire.affinities)
    && Array.isArray(value.grimoire.schools)
    && Array.isArray(value.grimoire.artifacts)
    && Array.isArray(value.achievements)
    && Array.isArray(value.titles);
}

function parsePollPayload(value: unknown): V2PollPayload | null {
  if (!isRecord(value) || typeof value.state !== "string" || !DELIVERY_STATES.has(value.state as V2DeliveryState)) {
    return null;
  }
  return {
    state: value.state as V2DeliveryState,
    character: isPublicCharacter(value.character) ? value.character : null,
  };
}

/**
 * A cold production request intentionally renders V1 while V2 enriches in the background.
 * Poll the existing safe projection endpoint for a bounded period so the same page can adopt
 * the V2 result without requiring a manual reload.
 */
export function useLiveCharacterPresentation(
  initial: CharacterPresentationModel,
  username: string
): CharacterPresentationModel {
  const [presentation, setPresentation] = useState(initial);

  useEffect(() => {
    setPresentation(initial);
    if (!initial.v2Enabled || initial.v2 || initial.delivery !== "enriching") return;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const schedule = () => {
      if (!controller.signal.aborted && attempts < POLL_DELAYS_MS.length) {
        timer = setTimeout(poll, POLL_DELAYS_MS[attempts]);
      }
    };

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/experimental/v2/characters/${encodeURIComponent(username)}`, {
          cache: "no-store",
          credentials: "omit",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok && response.status !== 202) {
          schedule();
          return;
        }

        const payload = parsePollPayload(await response.json());
        if (!payload) {
          schedule();
          return;
        }
        if (payload.character) {
          setPresentation({ v2Enabled: true, delivery: payload.state, v2: payload.character });
          return;
        }
        if (payload.state === "enriching") {
          schedule();
          return;
        }
        setPresentation({ v2Enabled: true, delivery: payload.state, v2: null });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) schedule();
      }
    };

    schedule();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [initial, username]);

  return presentation;
}
