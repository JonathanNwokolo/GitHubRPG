import type { OverridePhase } from "./CreatorOverrideSequence";

/** Delay before the first round card is rendered; later rounds are released by the reading pacing. */
export const DUEL_ROUND_REVEAL = {
  firstAt: 500,
} as const;

/**
 * Shared reading rhythm for every card of the duel (rounds and Creator Override
 * phases). Reading time only starts after the card is rendered, framed and the
 * auto-follow scroll has settled.
 */
export const DUEL_CARD_PACING = {
  entryMs: 500,
  readingMs: 3_000,
  transitionMs: 500,
  scrollSettleFallbackMs: 900,
} as const;

/**
 * The invocation clock is intentionally fixed only through the Creator card
 * flip. These values are already approved and must not be coupled to the
 * variable-length reading sequence that follows the reveal.
 */
export const CREATOR_OVERRIDE_TIMELINE = [
  { at: 0, phase: "apparent_defeat" },
  { at: 500, phase: "anomaly", sound: "clash" },
  { at: 1_000, phase: "summoning_circle", sound: "unlock" },
  { at: 2_200, phase: "card_entrance" },
  { at: 3_400, phase: "card_reveal", sound: "unlock" },
] as const satisfies ReadonlyArray<{
  at: number;
  phase: OverridePhase;
  sound?: "clash" | "unlock";
  restoreHp?: boolean;
}>;

export const CREATOR_OVERRIDE_PACING = {
  ...DUEL_CARD_PACING,
  approvedCardFlipMs: 850,
  finalTransitionMs: 1_500,
} as const;

/**
 * Each readable phase is released only after the previous phase has been
 * framed and read. Adding or removing a phase therefore changes the total
 * duration naturally instead of compressing the whole sequence.
 */
export const CREATOR_OVERRIDE_READING_SEQUENCE = [
  { phase: "card_reveal" },
  { phase: "effect_activation", sound: "clash" },
  { phase: "score_inversion" },
  { phase: "creator_ascension", sound: "unlock", restoreHp: true },
] as const satisfies ReadonlyArray<{
  phase: OverridePhase;
  sound?: "clash" | "unlock";
  restoreHp?: boolean;
}>;
