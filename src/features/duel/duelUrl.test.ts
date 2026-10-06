import { describe, expect, it } from "vitest";
import { duelPath, parseDuelUsername } from "./duelUrl";

describe("duel URL", () => {
  it("accepts usernames and one-segment GitHub profile URLs", () => {
    expect(parseDuelUsername("JonathanNwokolo")).toBe("JonathanNwokolo");
    expect(parseDuelUsername("https://github.com/ahejlsberg")).toBe("ahejlsberg");
    expect(parseDuelUsername("https://www.github.com/torvalds/")).toBe("torvalds");
  });

  it("rejects foreign hosts, nested paths and path injection", () => {
    expect(() => parseDuelUsername("https://example.com/user")).toThrow();
    expect(() => parseDuelUsername("https://github.com/org/repo")).toThrow();
    expect(() => parseDuelUsername("../admin")).toThrow();
  });

  it("creates one stable, canonical, shareable path", () => {
    expect(duelPath("JonathanNwokolo", "AHEJLSBERG")).toBe("/duel/jonathannwokolo/vs/ahejlsberg");
  });
});

