import { z } from "zod";
import { ENGINE_VERSION, SCHEMA_VERSION } from "./constants";
import type { RPGCharacterV2Public } from "./publicProjection";

export const V2_POLL_CONTRACT_VERSION = 1 as const;

const localizedText = z.object({ pt: z.string(), en: z.string() });
const coverage = z.enum(["full", "partial", "unavailable"]);
const publicCharacterSchema = z.object({
  engineVersion: z.literal(ENGINE_VERSION),
  identity: z.object({ className: z.string(), subclass: z.unknown().nullable(), evolution: z.unknown().nullable() }).passthrough(),
  grimoire: z.object({ affinities: z.array(z.unknown()), schools: z.array(z.unknown()), artifacts: z.array(z.unknown()) }).passthrough(),
  achievements: z.array(z.object({ id: z.string(), name: localizedText }).passthrough()),
  titles: z.array(z.object({ id: z.string(), name: localizedText }).passthrough()),
  explanation: z.object({ class: z.unknown(), subclass: z.unknown(), evolution: z.unknown() }).passthrough(),
  coverage: z.object({ schools: coverage, artifacts: coverage }),
}).passthrough();

export const v2PollPayloadSchema = z.object({
  contractVersion: z.literal(V2_POLL_CONTRACT_VERSION),
  engineVersion: z.literal(ENGINE_VERSION),
  schemaVersion: z.literal(SCHEMA_VERSION),
  state: z.enum(["ready", "stale", "enriching", "partial", "unavailable"]),
  terminal: z.boolean(),
  retryAfterMs: z.number().int().min(1_000).max(60_000).optional(),
  character: publicCharacterSchema.nullable().optional(),
}).superRefine((value, ctx) => {
  if ((value.state === "ready" || value.state === "stale" || value.state === "partial") && !value.character) {
    ctx.addIssue({ code: "custom", message: "usable_state_requires_character", path: ["character"] });
  }
});

export type V2PollPayload = Omit<z.infer<typeof v2PollPayloadSchema>, "character"> & {
  character?: RPGCharacterV2Public | null;
};

export function parseV2PollPayload(value: unknown): V2PollPayload | null {
  const parsed = v2PollPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data as V2PollPayload : null;
}
