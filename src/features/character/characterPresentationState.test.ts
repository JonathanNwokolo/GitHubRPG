import { describe, expect, it } from "vitest";
import type { CharacterPresentationModel } from "@/game-v2/publicProjection";
import type { V2PollStatus } from "./useLiveCharacterPresentation";
import { resolveCharacterRenderMode } from "./characterPresentationState";

const pending: CharacterPresentationModel = { v2Enabled: true, delivery: "enriching", v2: null };

describe("resolveCharacterRenderMode", () => {
  it.each(["idle", "polling"] as const)("keeps V1 hidden while V2 is %s", (status) => {
    expect(resolveCharacterRenderMode(pending, status)).toBe("loading");
  });

  it.each(["unavailable", "timed_out", "rate_limited", "failed"] as const)("uses V1 for terminal %s", (status) => {
    expect(resolveCharacterRenderMode(pending, status)).toBe("v1-fallback");
  });

  it("uses V1 immediately for an unavailable delivery contract", () => {
    expect(resolveCharacterRenderMode({ v2Enabled: true, delivery: "unavailable", v2: null }, "idle")).toBe("v1-fallback");
  });

  it("keeps a usable V2 projection for every live terminal presentation", () => {
    const v2 = {} as NonNullable<CharacterPresentationModel["v2"]>;
    for (const [delivery, status] of [["ready", "ready"], ["partial", "partial"], ["stale", "polling"]] as const) {
      expect(resolveCharacterRenderMode({ v2Enabled: true, delivery, v2 }, status as V2PollStatus)).toBe("v2");
    }
  });

  it("keeps the ordinary experience on V1 when the feature is disabled", () => {
    expect(resolveCharacterRenderMode({ v2Enabled: false, delivery: "unavailable", v2: null }, "idle")).toBe("v1");
  });
});
