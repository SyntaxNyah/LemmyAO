import calculateGifLength from "./calculateGifLength";
import calculateWebpLength from "./calculateWebpLength";
import calculateApngLength from "./calculateApngLength";

/** Extensions whose files can carry an animation worth measuring (APNGs are often named .png). */
export const MEASURABLE_EXTENSIONS = [".gif", ".webp", ".apng", ".png"];

const startsWith = (d: Uint8Array, at: number, text: string) =>
  [...text].every((c, i) => d[at + i] === c.charCodeAt(0));

/**
 * Length of an animation in ms, from its bytes rather than its name: asset
 * hosts serve GIFs named .webp and APNGs named .png. Unknown formats are 0.
 */
export function animationLength(file: ArrayBuffer): number {
  const d = new Uint8Array(file);
  if (startsWith(d, 0, "GIF8")) return calculateGifLength(file);
  if (startsWith(d, 0, "RIFF") && startsWith(d, 8, "WEBP")) return calculateWebpLength(file);
  if (d[0] === 0x89 && startsWith(d, 1, "PNG")) return calculateApngLength(file);
  return 0;
}

/**
 * How many times an animation plays: 0 means forever, 1 means once. GIFs
 * without a NETSCAPE loop block play once; unknown formats count as forever.
 */
export function animationLoops(file: ArrayBuffer): number {
  const d = new Uint8Array(file);
  const view = new DataView(file);
  if (startsWith(d, 0, "GIF8")) {
    for (let i = 13; i < d.length - 16; i++) {
      if (d[i] === 0x21 && d[i + 1] === 0xff && startsWith(d, i + 3, "NETSCAPE2.0")) return view.getUint16(i + 16, true);
    }
    return 1;
  }
  if (startsWith(d, 0, "RIFF") && startsWith(d, 8, "WEBP")) {
    for (let at = 12; at + 8 <= d.length; at += 8 + view.getUint32(at + 4, true) + (view.getUint32(at + 4, true) & 1)) {
      if (startsWith(d, at, "ANIM")) return view.getUint16(at + 12, true);
    }
    return 1;
  }
  if (d[0] === 0x89 && startsWith(d, 1, "PNG")) {
    for (let at = 8; at + 8 <= d.length; at += 12 + view.getUint32(at)) {
      if (startsWith(d, at + 4, "acTL")) return view.getUint32(at + 12);
    }
    return 1;
  }
  return 0;
}
