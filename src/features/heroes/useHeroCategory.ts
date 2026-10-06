import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHeroes } from "@/data/api/fetchHeroes";
import type { HeroCategoryId } from "./featuredHeroes";
import type { HeroesResponse } from "./heroSummary";

/**
 * Pauses before the automatic re-queries of a partial category (`pending > 0`). The server keeps loading the slow
 * profiles after answering, so each retry usually finds more of them. Two attempts at most: never a polling loop.
 */
export const AUTO_RETRY_DELAYS_MS = [6_000, 7_000] as const;

export type HeroCategoryStatus = "loading" | "ready" | "error";

export interface HeroCategoryState {
  /** The answer for the requested category (null while the first one is on its way, or after a failed one). */
  data: HeroesResponse | null;
  status: HeroCategoryStatus;
  /** An automatic re-query is scheduled or running. */
  updating: boolean;
  /** A re-query is running while the previous answer stays on screen. */
  refreshing: boolean;
  /** Ask again now: cancels the pending automatic attempt and starts a fresh automatic budget. */
  retry: () => void;
}

interface Snapshot {
  category: HeroCategoryId;
  data: HeroesResponse | null;
  status: HeroCategoryStatus;
}

/**
 * One category of the Hall of Heroes: first load, session cache and the bounded automatic refresh.
 * - a complete answer is remembered for the session; a partial one is not (coming back asks again);
 * - a partial answer stays on screen while the retries run, so the page never falls back to the skeleton;
 * - one request per category at a time; timers and requests die with the category or the component;
 * - the automatic attempt waits while the tab is hidden and resumes when it becomes visible.
 */
export function useHeroCategory(category: HeroCategoryId): HeroCategoryState {
  const sessionCache = useRef(new Map<HeroCategoryId, HeroesResponse>());
  const retryNow = useRef<() => void>(() => {});
  const [snapshot, setSnapshot] = useState<Snapshot>({ category, data: null, status: "loading" });
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const cached = sessionCache.current.get(category);
    if (cached) {
      setSnapshot({ category, data: cached, status: "ready" });
      setUpdating(false);
      setRefreshing(false);
      retryNow.current = () => {};
      return;
    }

    let cancelled = false;
    let shown: HeroesResponse | null = null;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waitingForVisible = false;
    let autoAttempts = 0;

    setSnapshot({ category, data: null, status: "loading" });
    setUpdating(false);
    setRefreshing(false);

    const stopTimer = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      waitingForVisible = false;
    };

    const scheduleAutoRetry = () => {
      stopTimer();
      if (autoAttempts >= AUTO_RETRY_DELAYS_MS.length) {
        setUpdating(false);
        return;
      }
      setUpdating(true);
      timer = setTimeout(() => {
        timer = undefined;
        if (document.visibilityState === "hidden") {
          waitingForVisible = true;
          return;
        }
        autoAttempts += 1;
        void load();
      }, AUTO_RETRY_DELAYS_MS[autoAttempts]);
    };

    async function load(): Promise<void> {
      if (controller) return; // one request per category at a time
      const mine = new AbortController();
      controller = mine;
      if (shown) setRefreshing(true);
      else setSnapshot({ category, data: null, status: "loading" });

      try {
        const response = await fetchHeroes(category, mine.signal);
        if (cancelled) return;
        shown = response;
        if (!response.partial) sessionCache.current.set(category, response);
        setSnapshot({ category, data: response, status: "ready" });
        if (response.pending > 0) scheduleAutoRetry();
        else {
          stopTimer();
          setUpdating(false);
        }
      } catch {
        if (cancelled) return;
        if (shown) scheduleAutoRetry(); // keep the heroes already shown; the next attempt may succeed
        else setSnapshot({ category, data: null, status: "error" });
      } finally {
        if (controller === mine) controller = undefined;
        if (!cancelled) setRefreshing(false);
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !waitingForVisible) return;
      waitingForVisible = false;
      autoAttempts += 1;
      void load();
    };

    retryNow.current = () => {
      if (controller) return;
      stopTimer();
      autoAttempts = 0;
      setUpdating(false);
      void load();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void load();

    return () => {
      cancelled = true;
      stopTimer();
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      retryNow.current = () => {};
    };
  }, [category]);

  const retry = useCallback(() => retryNow.current(), []);
  const current = snapshot.category === category;
  return {
    data: current ? snapshot.data : null,
    status: current ? snapshot.status : "loading",
    updating: current && updating,
    refreshing: current && refreshing,
    retry,
  };
}
