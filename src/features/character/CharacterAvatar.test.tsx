import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CharacterAvatar } from "./CharacterAvatar";

const PHOTO = "https://avatars.githubusercontent.com/u/1?v=4";

describe("CharacterAvatar", () => {
  it("shows the GitHub photo with an accessible alt text", () => {
    render(<CharacterAvatar seed={1} photoUrl={PHOTO} photoAlt="Foto de perfil de Octo" />);
    const img = screen.getByAltText("Foto de perfil de Octo");
    expect(img.getAttribute("src")).toContain("avatars.githubusercontent.com");
  });

  it("falls back to the procedural avatar when the photo fails to load", () => {
    const { container } = render(<CharacterAvatar seed={1} photoUrl={PHOTO} photoAlt="Foto de perfil de Octo" />);
    fireEvent.error(screen.getByAltText("Foto de perfil de Octo"));
    expect(screen.queryByAltText("Foto de perfil de Octo")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("uses the procedural avatar when there is no photo", () => {
    const { container } = render(<CharacterAvatar seed={1} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
