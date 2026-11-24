import { describe, expect, test } from "bun:test";
import { orderBackgrounds, type BackgroundChoice } from "../ui/client/backgroundOrder";

const bg = (name: string, options: Partial<BackgroundChoice> = {}): BackgroundChoice => ({
  name,
  favourite: false,
  current: false,
  ...options,
});

describe("background order", () => {
  test("current first, then favorites, then alphabetical", () => {
    const ordered = orderBackgrounds([
      bg("Zeta", { favourite: true }),
      bg("Anime"),
      bg("gs4", { current: true }),
      bg("birthday", { favourite: true }),
    ]);
    expect(ordered.map((choice) => choice.name)).toEqual(["gs4", "birthday", "Zeta", "Anime"]);
  });

  test("a current favorite stays first, and the input is not mutated", () => {
    const input = [bg("B"), bg("A", { current: true, favourite: true })];
    const ordered = orderBackgrounds(input);
    expect(ordered.map((choice) => choice.name)).toEqual(["A", "B"]);
    expect(input.map((choice) => choice.name)).toEqual(["B", "A"]);
  });
});