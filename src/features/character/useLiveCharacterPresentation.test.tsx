import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCharacterPresentationModel } from "@/game-v2/publicProjection";
import { createRPGCharacterV2 } from "@/game-v2/engine";
import { GOLDEN_FIXTURES } from "@/game-v2/fixtures";
import { useLiveCharacterPresentation } from "./useLiveCharacterPresentation";

const enriching = { v2Enabled: true, delivery: "enriching", v2: null } as const;
const character = createCharacterPresentationModel(true, { state: "ready", character: createRPGCharacterV2(GOLDEN_FIXTURES.architecturalSystem()) }).v2;

function response(state: "ready" | "partial" | "enriching" | "unavailable", status = state === "enriching" ? 202 : 200, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    contractVersion: 1,
    engineVersion: "2.0-experimental-v24-evo",
    schemaVersion: "game-engine-v2-schema-2",
    state,
    terminal: state !== "enriching",
    ...(state === "ready" || state === "partial" ? { character } : {}),
    ...extra,
  }), { status, headers: { "Content-Type": "application/json" } });
}

async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

describe("useLiveCharacterPresentation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(["ready", "partial"] as const)("treats %s as a usable terminal result", async (state) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(state)));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    expect(result.current.pollStatus).toBe(state);
    expect(result.current.v2).toBeTruthy();
  });

  it("terminates unavailable without inventing V2 data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("unavailable")));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    expect(result.current).toMatchObject({ pollStatus: "unavailable", delivery: "unavailable", v2: null });
  });

  it("exhausts the bounded schedule and leaves an explicit timed_out state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(response("enriching"))));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    for (const delay of [4_000, 4_000, 8_000, 12_000, 16_000, 16_000]) await advance(delay);
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(result.current.pollStatus).toBe("timed_out");
  });

  it("respects a bounded Retry-After response", async () => {
    const limited = new Response(JSON.stringify({ error: { code: "rate_limited" }, contractVersion: 1, engineVersion: "2.0-experimental-v24-evo", schemaVersion: "game-engine-v2-schema-2", state: "enriching", terminal: false, retryAfterMs: 8_000 }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "8" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(response("ready")));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    await advance(7_999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(result.current.pollStatus).toBe("ready");
  });

  it.each(["ready", "partial"] as const)("retries after one slow request and renders the cached %s V2 without showing V1", async (state) => {
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce((_url, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      }))
      .mockResolvedValueOnce(response(state)));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    await advance(10_000);
    expect(result.current).toMatchObject({ pollStatus: "polling", delivery: "enriching", v2: null });
    await advance(4_000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.pollStatus).toBe(state);
    expect(result.current.v2).toBeTruthy();
  });

  it("uses V1 fallback only after the global polling ceiling when every request times out", async () => {
    vi.stubGlobal("fetch", vi.fn((_url, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    })));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(64_999);
    expect(result.current.pollStatus).toBe("polling");
    await advance(1);
    expect(result.current).toMatchObject({ pollStatus: "timed_out", v2: null });
  });

  it("treats an HTTP 504 as one retryable request timeout", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response("unavailable", 504))
      .mockResolvedValueOnce(response("ready")));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    expect(result.current.pollStatus).toBe("polling");
    await advance(4_000);
    expect(result.current.pollStatus).toBe("ready");
  });

  it("never overlaps polling requests", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    await advance(5_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("pauses while hidden and resumes once without overlapping", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("ready")));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await advance(20_000);
    expect(fetch).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await advance(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.pollStatus).toBe("ready");
  });

  it("aborts the old request on username change and ignores its late response", async () => {
    let resolveOld!: (value: Response) => void;
    const old = new Promise<Response>((resolve) => { resolveOld = resolve; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(old).mockResolvedValueOnce(response("ready")));
    const { result, rerender } = renderHook(({ username }) => useLiveCharacterPresentation(enriching, username), { initialProps: { username: "a" } });
    await advance(4_000);
    rerender({ username: "b" });
    await advance(4_000);
    resolveOld(response("unavailable"));
    await act(async () => Promise.resolve());
    expect(result.current.pollStatus).toBe("ready");
  });

  it("aborts in-flight work and removes visibility listeners on unmount", async () => {
    let observedSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url, init?: RequestInit) => {
      observedSignal = init?.signal as AbortSignal;
      return new Promise<Response>(() => undefined);
    }));
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    unmount();
    expect(observedSignal?.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("rejects an incompatible payload safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ contractVersion: 2, state: "ready", character }), { status: 200 })));
    const { result } = renderHook(() => useLiveCharacterPresentation(enriching, "hero"));
    await advance(4_000);
    expect(result.current.pollStatus).toBe("failed");
    expect(result.current.v2).toBeNull();
  });

  it("keeps a usable stale V2 projection while refresh polling runs", () => {
    const stale = { v2Enabled: true, delivery: "stale", v2: character } as const;
    vi.stubGlobal("fetch", vi.fn());
    const { result } = renderHook(() => useLiveCharacterPresentation(stale, "hero"));
    expect(result.current.pollStatus).toBe("polling");
    expect(result.current.v2).toBe(character);
  });
});
