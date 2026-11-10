import { test, expect } from "bun:test";
import calculateApngLength from "../utils/calculateApngLength";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function chunk(type: string, data: number[]) {
  const len = data.length;
  return [
    (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff,
    ...[...type].map((c) => c.charCodeAt(0)),
    ...data,
    0, 0, 0, 0, // CRC, unchecked
  ];
}

/** fcTL data: sequence, width, height, x, y (4 bytes each), delay num/den (2 each), dispose, blend. */
function fctl(num: number, den: number) {
  return chunk("fcTL", [
    ...new Array(20).fill(0),
    (num >>> 8) & 0xff, num & 0xff,
    (den >>> 8) & 0xff, den & 0xff,
    0, 0,
  ]);
}

const apng = (...chunks: number[][]) => new Uint8Array([...SIGNATURE, ...chunks.flat()]).buffer;

test("sums the frame delays in milliseconds", () => {
  // 3 frames of 1/10 s, 1 frame of 500/1000 s
  const file = apng(chunk("IHDR", new Array(13).fill(0)), fctl(1, 10), fctl(1, 10), fctl(1, 10), fctl(500, 1000), chunk("IEND", []));
  expect(calculateApngLength(file)).toBeCloseTo(800);
});

test("a zero denominator means hundredths of a second", () => {
  expect(calculateApngLength(apng(fctl(25, 0)))).toBeCloseTo(250);
});

test("16-bit delays are read in full", () => {
  expect(calculateApngLength(apng(fctl(300, 1000)))).toBeCloseTo(300);
});

test("fcTL bytes inside image data are not mistaken for a chunk", () => {
  const idat = chunk("IDAT", [0x66, 0x63, 0x54, 0x4c, ...new Array(30).fill(0xff)]);
  expect(calculateApngLength(apng(fctl(1, 10), idat))).toBeCloseTo(100);
});
