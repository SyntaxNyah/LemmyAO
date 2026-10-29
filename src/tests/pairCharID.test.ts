import { describe, expect, it } from "bun:test";
import { parsePairedCharID } from "../utils/pairCharID";

describe("parsePairedCharID", () => {
  it("accepts character slot 0", () => {
    expect(parsePairedCharID("0")).toBe(0);
  });

  it("accepts positive character ids", () => {
    expect(parsePairedCharID("4")).toBe(4);
    expect(parsePairedCharID(" 12 ")).toBe(12);
  });

  it("treats None, empty and invalid values as no pair", () => {
    expect(parsePairedCharID("-1")).toBe(-1);
    expect(parsePairedCharID("")).toBe(-1);
    expect(parsePairedCharID("   ")).toBe(-1);
    expect(parsePairedCharID("abc")).toBe(-1);
    expect(parsePairedCharID("1.5")).toBe(-1);
    expect(parsePairedCharID("-2")).toBe(-1);
  });
});
