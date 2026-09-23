/** Emote phase driving which motion a 3D character plays. */
export type MmdState = "idle" | "talking" | "preanim";

/**
 * Resolved 3D render data for one IC message, computed during asset preload and
 * stashed on the ChatMsg. Holds the character/emote identity, the emote's clip
 * set (preanim intro, base loop, postanim outro, camera VMD) and the measured
 * preanim length so the chat_tick timeline stays in step with the sprites.
 */
export interface Model3dInfo {
  charName: string;
  modelFile: string;
  /** Base loop motion (a legacy stem or a block-format filename with ext). */
  emote: string;
  /** Intro clip played once before the loop, or null. */
  preanim: string | null;
  /** Outro clip played when leaving this emote for another, or null. */
  postanim: string | null;
  /** Camera-track VMD framing this emote, or null for the default camera. */
  camera: string | null;
  /** The sender ticked the preanim checkbox: replay the intro even on a repeat. */
  playPreanim: boolean;
  /**
   * Combined length of the clips that play before the loop (leaving postanim +
   * intro), or 0 when none. Talking waits this long so it starts on the loop.
   */
  preanimDurationMs: number;
}
