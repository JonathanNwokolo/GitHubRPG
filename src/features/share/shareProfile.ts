/**
 * "Share profile": the native share sheet when the browser has one (Web Share API), otherwise the
 * profile link goes to the clipboard. It always shares the character sheet URL, never the card image.
 */

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

/**
 * - shared:    the native share sheet completed
 * - cancelled: the person dismissed the sheet (not an error)
 * - copied:    the link is on the clipboard
 * - failed:    nothing worked; the UI shows the link so it can be copied by hand
 */
export type ShareProfileResult = "shared" | "cancelled" | "copied" | "failed";

/** The slice of `navigator` this module uses (so tests can pass a fake). */
export interface ShareNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

/** Last resort for contexts without the async Clipboard API (plain http, old browsers). */
function copyWithSelection(text: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(field);
  }
}

export async function copyToClipboard(text: string, nav: ShareNavigator = defaultNavigator()): Promise<boolean> {
  try {
    if (nav.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: try the fallback below.
  }
  return copyWithSelection(text);
}

function defaultNavigator(): ShareNavigator {
  return typeof navigator === "undefined" ? {} : navigator;
}

export async function shareProfile(data: ShareData, nav: ShareNavigator = defaultNavigator()): Promise<ShareProfileResult> {
  // navigator.share needs the click's user activation, so it is called before any await.
  if (typeof nav.share === "function" && (typeof nav.canShare !== "function" || nav.canShare(data))) {
    try {
      await nav.share(data);
      return "shared";
    } catch (error) {
      // Dismissing the sheet is a normal outcome. Any other failure falls back to copying the link.
      if (isAbortError(error)) return "cancelled";
    }
  }
  return (await copyToClipboard(data.url, nav)) ? "copied" : "failed";
}
