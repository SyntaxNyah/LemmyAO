import { describe, expect, test } from "bun:test";
import { Side } from "aolib-ts";
import {
  BACKGROUND_POSITIONS,
  availableBackgroundPositions,
  backgroundPositionFile,
  backgroundPositionFor,
} from "../ui/client/backgroundPositions";

describe("background positions", () => {
  test("maps sides to labels and image bases", () => {
    expect(BACKGROUND_POSITIONS.map((position) => position.label)).toContain("Witness");
    expect(backgroundPositionFor(Side.wit)).toMatchObject({ label: "Witness", image: "witnessempty" });
    expect(backgroundPositionFor(Side.jud)?.image).toBe("judgestand");
  });

  test("filters to the images a folder actually has", () => {
    const files = [
      "defenseempty.webp",
      "prosecutorempty.webp",
      "helperstand.webp",
      "prohelperstand.webp",
      "witnessempty.webp",
      "judgestand.webp",
    ];
    expect(availableBackgroundPositions(files).map((position) => position.side)).toEqual([
      Side.def,
      Side.pro,
      Side.hld,
      Side.hlp,
      Side.wit,
      Side.jud,
    ]);
    expect(backgroundPositionFile(backgroundPositionFor(Side.wit)!, files)).toBe("witnessempty.webp");
  });

  test("falls back to every position when the listing is unavailable", () => {
    expect(availableBackgroundPositions([])).toEqual(BACKGROUND_POSITIONS);
    expect(availableBackgroundPositions(["notes.txt"])).toEqual(BACKGROUND_POSITIONS);
  });
});