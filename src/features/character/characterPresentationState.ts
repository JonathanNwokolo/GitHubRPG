import type { CharacterPresentationModel } from "@/game-v2/publicProjection";
import type { V2PollStatus } from "./useLiveCharacterPresentation";

export type CharacterRenderMode = "loading" | "v2" | "v1-fallback" | "v1";

export function resolveCharacterRenderMode(
  presentation: CharacterPresentationModel,
  pollStatus: V2PollStatus
): CharacterRenderMode {
  if (presentation.v2) return "v2";
  if (!presentation.v2Enabled) return "v1";
  if (
    (presentation.delivery === "enriching" || presentation.delivery === "stale")
    && (pollStatus === "idle" || pollStatus === "polling")
  ) return "loading";
  return "v1-fallback";
}
