import { describe, expect, it, vi } from "vitest";
import { copyToClipboard, shareProfile, type ShareData } from "./shareProfile";

const data: ShareData = {
  title: "octocat — GitHub RPG",
  text: "Veja o personagem de octocat no GitHub RPG.",
  url: "https://githubrpg.vercel.app/octocat",
};

const abort = () => Object.assign(new Error("Share canceled"), { name: "AbortError" });

describe("shareProfile", () => {
  it("calls navigator.share with title, text and url when the Web Share API exists", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();

    await expect(shareProfile(data, { share, clipboard: { writeText } })).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("calls share as a method of the navigator (it throws 'Illegal invocation' when detached)", async () => {
    const nav = {
      share(this: unknown) {
        if (this !== nav) throw new TypeError("Illegal invocation");
        return Promise.resolve();
      },
    };
    await expect(shareProfile(data, nav)).resolves.toBe("shared");
  });

  it("copies the URL when the Web Share API is missing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(shareProfile(data, { clipboard: { writeText } })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("copies the URL when canShare rejects the data", async () => {
    const share = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(shareProfile(data, { share, canShare: () => false, clipboard: { writeText } })).resolves.toBe("copied");
    expect(share).not.toHaveBeenCalled();
  });

  it("reports a dismissed share sheet as cancelled and does not copy", async () => {
    const writeText = vi.fn();
    const share = vi.fn().mockRejectedValue(abort());

    await expect(shareProfile(data, { share, clipboard: { writeText } })).resolves.toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the URL when the share sheet fails for a reason other than a dismissal", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new TypeError("not allowed"));

    await expect(shareProfile(data, { share, clipboard: { writeText } })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("reports failure (instead of throwing) when nothing can share or copy", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));

    await expect(shareProfile(data, { clipboard: { writeText } })).resolves.toBe("failed");
    await expect(shareProfile(data, {})).resolves.toBe("failed");
  });
});

describe("copyToClipboard", () => {
  it("uses the async Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyToClipboard("hello", { clipboard: { writeText } })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to a selection copy when the Clipboard API is unavailable", async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true, writable: true });
    try {
      await expect(copyToClipboard("hello", {})).resolves.toBe(true);
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(document.querySelector("textarea")).toBeNull();
    } finally {
      Object.defineProperty(document, "execCommand", { value: undefined, configurable: true, writable: true });
    }
  });
});
