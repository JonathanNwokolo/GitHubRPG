// @vitest-environment node
import { describe, expect, it } from "vitest";
import { makeAverageProfile } from "@/test/builders";
import { createProfileFingerprint } from "./runtimeDelivery";

describe("V2 runtime delivery identity", () => {
  it("does not turn equivalent fetch timestamps into different source fingerprints", () => {
    const first = makeAverageProfile({ referenceDate: "2026-10-07T12:01:00.000Z" });
    const second = makeAverageProfile({ referenceDate: "2026-10-07T12:59:00.000Z" });
    expect(createProfileFingerprint(first)).toBe(createProfileFingerprint(second));
  });

  it("changes when source data changes", () => {
    const first = makeAverageProfile();
    const second = makeAverageProfile({ commits: { value: first.commits.value + 1, coverage: "full" } });
    expect(createProfileFingerprint(first)).not.toBe(createProfileFingerprint(second));
  });
});
