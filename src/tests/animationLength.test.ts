import { test, expect } from "bun:test";
import { animationLength, animationLoops } from "../utils/calculatorHandler";

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

const u16le = (n: number) => [n & 0xff, n >> 8];
const u32le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24];
const u32be = (n: number) => [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];

test("loop counts: a GIF without a NETSCAPE block plays once, 0 means forever", () => {
  const header: (string | number[])[] = ["GIF89a", [0, 0, 0, 0, 0, 0, 0]];
  const netscape = (loops: number) => [0x21, 0xff, 0x0b, ..."NETSCAPE2.0".split("").map((c) => c.charCodeAt(0)), 0x03, 0x01, ...u16le(loops), 0x00];
  expect(animationLoops(bytes(...header, gifFrame))).toBe(1);
  expect(animationLoops(bytes(...header, netscape(0), gifFrame))).toBe(0);
  expect(animationLoops(bytes(...header, netscape(3), gifFrame))).toBe(3);
});

test("loop counts: WebP from its ANIM chunk, APNG from acTL", () => {
  const vp8x: (string | number[])[] = ["VP8X", u32le(10), new Array(10).fill(0)];
  const anim = (loops: number): (string | number[])[] => ["ANIM", u32le(6), [0, 0, 0, 0], u16le(loops)];
  expect(animationLoops(bytes("RIFF", u32le(0), "WEBP", ...vp8x, ...anim(1)))).toBe(1);
  expect(animationLoops(bytes("RIFF", u32le(0), "WEBP", ...vp8x, ...anim(0)))).toBe(0);
  const actl = (plays: number) => [...u32be(8), ..."acTL".split("").map((c) => c.charCodeAt(0)), ...u32be(2), ...u32be(plays), 0, 0, 0, 0];
  expect(animationLoops(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a], actl(0)))).toBe(0);
  expect(animationLoops(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a], actl(1)))).toBe(1);
});
