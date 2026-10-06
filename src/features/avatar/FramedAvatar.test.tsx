import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getAvatarFrameForUsername } from "./avatarFrames";
import { FramedAvatar } from "./FramedAvatar";

const PHOTO = "https://avatars.githubusercontent.com/u/1?v=4";

describe("FramedAvatar", () => {
  it("shows the photo with its alt text and a decorative frame picked from the username", () => {
    const { container } = render(<FramedAvatar username="torvalds" avatarUrl={PHOTO} alt="Foto de Linus" />);
    expect(screen.getByAltText("Foto de Linus").getAttribute("src")).toContain("avatars.githubusercontent.com");

    const frameImg = container.querySelector('img[aria-hidden="true"]');
    expect(frameImg).not.toBeNull();
    expect(frameImg?.getAttribute("alt")).toBe("");
    expect(frameImg?.getAttribute("src")).toContain(getAvatarFrameForUsername("torvalds").src.replace("/", ""));
  });

  it("gives the same username the same frame in separate renders, regardless of case", () => {
    const a = render(<FramedAvatar username="Torvalds" alt="" />);
    const b = render(<FramedAvatar username="torvalds" alt="" />);
    expect(a.container.firstElementChild?.getAttribute("data-avatar-frame")).toBe(
      b.container.firstElementChild?.getAttribute("data-avatar-frame"),
    );
  });

  it("renders the fallback when there is no photo", () => {
    render(<FramedAvatar username="octo" alt="" fallback={<span>OC</span>} />);
    expect(screen.getByText("OC")).toBeInTheDocument();
  });

  it("renders the fallback when the photo fails to load", () => {
    render(<FramedAvatar username="octo" avatarUrl={PHOTO} alt="Foto de Octo" fallback={<span>OC</span>} />);
    fireEvent.error(screen.getByAltText("Foto de Octo"));
    expect(screen.queryByAltText("Foto de Octo")).toBeNull();
    expect(screen.getByText("OC")).toBeInTheDocument();
  });

  it("does not break without avatar, username or fallback, and uses the default frame", () => {
    const { container } = render(<FramedAvatar alt="" />);
    expect(container.firstElementChild?.getAttribute("data-avatar-frame")).toBe(getAvatarFrameForUsername().id);
  });

  it("applies an explicit pixel size to the slot", () => {
    const { container } = render(<FramedAvatar username="octo" alt="" size={120} />);
    expect(container.firstElementChild).toHaveStyle({ width: "120px", height: "120px" });
  });
});
