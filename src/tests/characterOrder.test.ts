import { describe, expect, test } from "bun:test";
import { orderCharacters, type CharacterChoice } from "../ui/client/characterOrder";

const choice = (id: number, name: string, options: Partial<CharacterChoice> = {}): CharacterChoice => ({
  id,
  name,
  taken: false,
  favourite: false,
  current: false,
  ...options,
});

describe("character order", () => {
  test("the current character comes first, then favorites, then roster order", () => {
    const ordered = orderCharacters([
      choice(4, "Edgeworth", { favourite: true }),
      choice(3, "Phoenix", { current: true }),
      choice(1, "Fenomeno3D"),
      choice(2, "test3d", { favourite: true }),
    ]);
    expect(ordered.map((c) => c.name)).toEqual(["Phoenix", "test3d", "Edgeworth", "Fenomeno3D"]);
  });

  test("a current favorite is still first, and the input is not mutated", () => {
    const input = [choice(2, "B"), choice(1, "A", { current: true, favourite: true })];
    const ordered = orderCharacters(input);
    expect(ordered.map((c) => c.name)).toEqual(["A", "B"]);
    expect(input.map((c) => c.name)).toEqual(["B", "A"]);
  });

  test("without a current character, favorites keep roster order", () => {
    const ordered = orderCharacters([
      choice(1, "A"),
      choice(2, "B", { favourite: true }),
      choice(3, "C", { favourite: true }),
    ]);
    expect(ordered.map((c) => c.name)).toEqual(["B", "C", "A"]);
  });
});