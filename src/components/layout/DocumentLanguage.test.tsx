import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { DocumentLanguage } from "./DocumentLanguage";
import { useUiStore } from "@/stores/useUiStore";

afterEach(() => {
  useUiStore.setState({ language: "pt-BR" });
  document.documentElement.lang = "";
});

describe("DocumentLanguage", () => {
  it("sets <html lang> to the interface language", () => {
    render(<DocumentLanguage />);
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  it("follows the language switch PT <-> EN", () => {
    render(<DocumentLanguage />);

    act(() => useUiStore.getState().setLanguage("en"));
    expect(document.documentElement.lang).toBe("en");

    act(() => useUiStore.getState().setLanguage("pt-BR"));
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  it("renders no markup of its own", () => {
    const { container } = render(<DocumentLanguage />);
    expect(container).toBeEmptyDOMElement();
  });
});
