/** Total of unique profiles summoned so far, or null when unknown. Never throws except on abort. */
export async function fetchInvokedProfileCount(signal?: AbortSignal): Promise<number | null> {
  const response = await fetch("/api/stats", { signal });
  if (!response.ok) return null;
  const body = (await response.json()) as { uniqueProfilesInvoked?: unknown } | null;
  const total = body?.uniqueProfilesInvoked;
  return typeof total === "number" && Number.isSafeInteger(total) && total >= 0 ? total : null;
}
