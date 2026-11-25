import { describe, expect, test } from "bun:test";
import { clampPenalty, PENALTY_PIP_COUNT, penaltyPips } from "../ui/client/penaltyBars";

describe("penalty bars", () => {
  test("clamps health to the ten segments the bars can show", () => {
    expect(PENALTY_PIP_COUNT).toBe(10);
    expect(clampPenalty(-3)).toBe(0);
    expect(clampPenalty(0)).toBe(0);
    expect(clampPenalty(7.4)).toBe(7);
    expect(clampPenalty(10)).toBe(10);
    expect(clampPenalty(42)).toBe(10);
  });

  test("fills exactly the current number of pips", () => {
    expect(penaltyPips(0).filter(Boolean)).toHaveLength(0);
    expect(penaltyPips(7).filter(Boolean)).toHaveLength(7);
    expect(penaltyPips(10).every(Boolean)).toBe(true);
    expect(penaltyPips(99).every(Boolean)).toBe(true);
  });
});