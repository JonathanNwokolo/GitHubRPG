import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fetchInvokedProfileCount } from "@/data/api/fetchStats";
import { useUiStore } from "@/stores/useUiStore";
import { InvokedProfilesCounter, MIN_INVOKED_PROFILES_TO_SHOW } from "./InvokedProfilesCounter";

vi.mock("@/data/api/fetchStats", () => ({ fetchInvokedProfileCount: vi.fn() }));
const mockedFetch = vi.mocked(fetchInvokedProfileCount);

describe("InvokedProfilesCounter (Home social proof)", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    useUiStore.setState({ language: "pt-BR" });
  });

  it("starts at 25: the figure is hidden below it and shown from it", () => {
    expect(MIN_INVOKED_PROFILES_TO_SHOW).toBe(25);
  });

  it("stays hidden below the threshold, including zero", async () => {
    for (const total of [0, 1, 24]) {
      mockedFetch.mockResolvedValueOnce(total);
      const { container, unmount } = render(<InvokedProfilesCounter />);
      await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
      await Promise.resolve();
      expect(container).toHaveTextContent("");
      unmount();
      mockedFetch.mockClear();
    }
  });

  it("is shown from the threshold on", async () => {
    mockedFetch.mockResolvedValueOnce(25);
    render(<InvokedProfilesCounter />);
    expect(await screen.findByText("25 fichas únicas invocadas")).toBeInTheDocument();
  });

  it("uses the Portuguese copy and number format", async () => {
    mockedFetch.mockResolvedValueOnce(1284);
    render(<InvokedProfilesCounter />);
    expect(await screen.findByText("1.284 fichas únicas invocadas")).toBeInTheDocument();
  });

  it("uses the English copy and number format", async () => {
    useUiStore.setState({ language: "en" });
    mockedFetch.mockResolvedValueOnce(1284);
    render(<InvokedProfilesCounter />);
    expect(await screen.findByText("1,284 unique sheets summoned")).toBeInTheDocument();
  });

  it("renders nothing while loading, when the total is unknown, or when the request fails", async () => {
    let resolve!: (value: number | null) => void;
    mockedFetch.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const loading = render(<InvokedProfilesCounter />);
    expect(loading.container).toHaveTextContent("");
    resolve(null);
    await Promise.resolve();
    expect(loading.container).toHaveTextContent("");
    loading.unmount();

    mockedFetch.mockRejectedValueOnce(new Error("offline"));
    const failed = render(<InvokedProfilesCounter />);
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(failed.container).toHaveTextContent("");
  });

  it("never says people, users or visitors", async () => {
    mockedFetch.mockResolvedValue(100);
    for (const language of ["pt-BR", "en"] as const) {
      useUiStore.setState({ language });
      const { container, unmount } = render(<InvokedProfilesCounter />);
      await waitFor(() => expect(container.textContent).toMatch(/100/));
      expect(container.textContent).not.toMatch(/pessoas|usuários|visitantes|people|users|visitors/i);
      unmount();
    }
  });
});
