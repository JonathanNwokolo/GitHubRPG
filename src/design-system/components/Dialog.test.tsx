import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "./Dialog";

function Harness({ onCloseSpy }: { onCloseSpy?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open it</button>
      <Dialog
        isOpen={open}
        onClose={() => {
          onCloseSpy?.();
          setOpen(false);
        }}
        title="Share card"
        description="Pick what to do"
        closeLabel="Close dialog"
      >
        <button>First action</button>
        <button>Last action</button>
      </Dialog>
    </>
  );
}

afterEach(() => {
  document.body.style.overflow = "";
});

function openDialog() {
  const opener = screen.getByRole("button", { name: "Open it" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("Dialog accessibility", () => {
  it("portals the overlay outside a transformed application wrapper", () => {
    const { container } = render(
      <div data-testid="transformed-wrapper" style={{ transform: "translateY(1px)" }}>
        <Dialog isOpen onClose={() => {}} title="Portaled">
          content
        </Dialog>
      </div>
    );

    const dialog = screen.getByRole("dialog", { name: "Portaled" });
    expect(container).not.toContainElement(dialog);
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it("is a modal dialog with an accessible name and description", () => {
    render(<Harness />);
    openDialog();

    const dialog = screen.getByRole("dialog", { name: "Share card" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Pick what to do");
  });

  it("gives each dialog its own title id (no duplicate ids)", () => {
    render(
      <>
        <Dialog isOpen onClose={() => {}} title="One">
          a
        </Dialog>
        <Dialog isOpen onClose={() => {}} title="Two">
          b
        </Dialog>
      </>
    );

    const [first, second] = screen.getAllByRole("dialog");
    expect(first.getAttribute("aria-labelledby")).not.toBe(second.getAttribute("aria-labelledby"));
  });

  it("moves focus into the dialog when it opens", () => {
    render(<Harness />);
    openDialog();

    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close dialog" }));
  });

  it("closes on Escape and gives focus back to the button that opened it", () => {
    const onCloseSpy = vi.fn();
    render(<Harness onCloseSpy={onCloseSpy} />);
    const opener = openDialog();

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it("closes from the close button and restores focus too", () => {
    render(<Harness />);
    const opener = openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it("closes when the overlay is clicked but not when the dialog content is clicked", () => {
    const onCloseSpy = vi.fn();
    render(<Harness onCloseSpy={onCloseSpy} />);
    openDialog();

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onCloseSpy).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement!);
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps focus inside: Tab on the last control wraps to the first, Shift+Tab on the first wraps to the last", () => {
    render(<Harness />);
    openDialog();
    const close = screen.getByRole("button", { name: "Close dialog" });
    const last = screen.getByRole("button", { name: "Last action" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("pulls focus back in when it somehow sits outside the dialog", () => {
    render(<Harness />);
    const opener = openDialog();
    opener.focus();

    fireEvent.keyDown(opener, { key: "Tab" });

    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });

  it("locks the page scroll while open and releases it on close", () => {
    document.body.style.overflow = "auto";
    render(<Harness />);
    openDialog();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
    expect(document.body.style.overflow).toBe("auto");
  });

  it("does not steal focus back when the parent re-renders with a new onClose", () => {
    const { rerender } = render(
      <Dialog isOpen onClose={() => {}} title="T" closeLabel="Close dialog">
        <button>Field</button>
      </Dialog>
    );
    const field = screen.getByRole("button", { name: "Field" });
    field.focus();

    rerender(
      <Dialog isOpen onClose={() => {}} title="T" closeLabel="Close dialog">
        <button>Field</button>
      </Dialog>
    );

    expect(document.activeElement).toBe(field);
  });

  it("has a close button with a label and a touch target of at least 44x44", () => {
    render(<Dialog isOpen onClose={() => {}} title="T" closeLabel="Fechar janela">x</Dialog>);

    const close = screen.getByRole("button", { name: "Fechar janela" });
    expect(close).toHaveClass("min-w-[44px]", "min-h-[44px]");
    expect(close).toHaveAttribute("type", "button");
  });
});
