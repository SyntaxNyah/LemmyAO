import { test, expect } from "bun:test";
import { animationLength } from "../utils/calculatorHandler";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p))).buffer;

// Graphic Control Extension with a delay of 50 hundredths (500 ms).
const gifFrame = [0x21, 0xf9, 0x04, 0x00, 50, 0, 0, 0x00];

test("a GIF is measured as a GIF whatever it is called", () => {
  expect(animationLength(bytes("GIF89a", [0, 0, 0, 0], gifFrame, gifFrame))).toBe(1000);
});

test("a PNG signature is measured as APNG", () => {
  const fctl = [0, 0, 0, 26, ..."fcTL".split("").map((c) => c.charCodeAt(0)), ...new Array(20).fill(0), 0, 3, 0, 10, 0, 0, 0, 0, 0, 0];
  expect(animationLength(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a], fctl))).toBeCloseTo(300);
});

test("unknown data has no length", () => {
  expect(animationLength(bytes("<html>not an image</html>"))).toBe(0);
});
