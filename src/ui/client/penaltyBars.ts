/** The number of segments in a penalty bar. */
export const PENALTY_PIP_COUNT = 10;

/** Clamps a server health value to the 0..10 the bars can show. */
export function clampPenalty(value: number): number {
  return Math.min(PENALTY_PIP_COUNT, Math.max(0, Math.round(value)));
}

/** One boolean per pip: true for filled segments. */
export function penaltyPips(value: number): boolean[] {
  const level = clampPenalty(value);
  return Array.from({ length: PENALTY_PIP_COUNT }, (_, index) => index < level);
}