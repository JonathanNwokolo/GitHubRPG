import { describe, expect, it } from "vitest";
import {
  CREATOR_OVERRIDE_TIMELINE,
  CREATOR_OVERRIDE_PACING,
  CREATOR_OVERRIDE_READING_SEQUENCE,
  DUEL_CARD_PACING,
} from "./creatorOverrideTimeline";

describe("Creator Override presentation timeline", () => {
  it("keeps the approved invocation clock fixed through the card flip", () => {
    expect(CREATOR_OVERRIDE_TIMELINE[0]).toMatchObject({ at: 0, phase: "apparent_defeat" });
    expect(CREATOR_OVERRIDE_TIMELINE.at(-1)).toMatchObject({ at: 3_400, phase: "card_reveal" });
    expect(CREATOR_OVERRIDE_TIMELINE.map((event) => event.at)).toEqual(
      [...CREATOR_OVERRIDE_TIMELINE].map((event) => event.at).sort((a, b) => a - b)
    );
  });

  it("defines a dynamic post-reveal reading sequence with reusable pacing", () => {
    expect(CREATOR_OVERRIDE_READING_SEQUENCE.map(({ phase }) => phase)).toEqual([
      "card_reveal",
      "effect_activation",
      "score_inversion",
      "creator_ascension",
    ]);
    expect(CREATOR_OVERRIDE_PACING).toMatchObject({
      entryMs: 500,
      readingMs: 3_000,
      transitionMs: 500,
      finalTransitionMs: 1_500,
    });
  });

  it("shares one reading rhythm between round cards and the Creator Override cards", () => {
    expect(DUEL_CARD_PACING).toMatchObject({ entryMs: 500, readingMs: 3_000, transitionMs: 500 });
    expect(CREATOR_OVERRIDE_PACING.readingMs).toBe(DUEL_CARD_PACING.readingMs);
    expect(CREATOR_OVERRIDE_PACING.entryMs).toBe(DUEL_CARD_PACING.entryMs);
    expect(CREATOR_OVERRIDE_PACING.transitionMs).toBe(DUEL_CARD_PACING.transitionMs);
  });
});
