// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyV2Error, createV2SubjectId, emitV2Telemetry } from "./telemetry";

afterEach(() => vi.restoreAllMocks());

describe("V2 structured telemetry", () => {
  it("uses a stable truncated hash instead of the public username", () => {
    const first = createV2SubjectId("CacheHero");
    expect(first).toBe(createV2SubjectId(" cachehero "));
    expect(first).toMatch(/^[a-f0-9]{12}$/);
    expect(first).not.toContain("cachehero");
  });

  it.each([
    [new Error("github_v21_http_429"), "github_rate_limit"],
    [new DOMException("aborted", "AbortError"), "timeout"],
    [new Error("github_v21_http_503"), "github_5xx"],
    [new Error("fetch failed: network"), "github_network"],
    [new Error("payload invalid"), "invalid_payload"],
  ] as const)("classifies %s as %s", (error, expected) => {
    expect(classifyV2Error(error)).toBe(expected);
  });

  it("emits one JSON object with required fields and no supplied secret", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    emitV2Telemetry({ event: "v2_cache_hit", correlation_id: "request-1", subject_id: "abc123def456", duration_ms: 4, cache_source: "l2" });
    const value = JSON.parse(String(info.mock.calls[0][0]));
    expect(value).toMatchObject({ event: "v2_cache_hit", correlation_id: "request-1", subject_id: "abc123def456", duration_ms: 4, cache_source: "l2" });
    expect(JSON.stringify(value)).not.toMatch(/authorization|cookie|token/i);
  });
});
