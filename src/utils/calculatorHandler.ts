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
