/** Emote phase driving which motion a 3D character plays. */
export type MmdState = "idle" | "talking" | "preanim";

/**
 * Resolved 3D render data for one IC message, computed during asset
 * preload and stashed on the ChatMsg. Holds the character/emote identity
 * plus the measured preanim length so the chat_tick timeline behaves the
 * same as it does for sprite characters.
 */
export interface Model3dInfo {
  charName: string;
  modelFile: string;
  emote: string;
  preanim: string | null;
  preanimDurationMs: number;
}
