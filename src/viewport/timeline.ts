/**
 * The playback plan for one IC message: every visual change and sound, with its
 * time in ms from the start. Built before anything plays, so the order is fixed
 * (shout, preanim, talking, idle) and sounds can be scheduled ahead of time.
 */

export type TimelineEvent =
  /** Shout bubble and its sound. */
  | { at: number; kind: "shout" }
  /** The shout is over: preanim sprite, screen shake / flash flags, their sounds. */
  | { at: number; kind: "preanim" }
  /** The emote's sound effect. */
  | { at: number; kind: "sfx" }
  /** Talking sprite, chatbox, evidence. */
  | { at: number; kind: "talk" }
  /** Show the chatbox before talking starts (text over a non-interrupting preanim). */
  | { at: number; kind: "chatbox" }
  /** Reveal the character at `index` of the message. */
  | { at: number; kind: "char"; index: number }
  | { at: number; kind: "blip" }
  /** Inline `\s` / `\f` commands. */
  | { at: number; kind: "shake" | "flash" }
  | { at: number; kind: "idle" };

export interface TimelineInput {
  /** Shout bubble length; 0 without a shout. */
  shoutMs: number;
  /** Preanim length; 0 without one. */
  preanimMs: number;
  /** Text runs while the preanim plays. */
  nonInterrupting: boolean;
  /** The message, one entry per character, as the chatbox shows them. */
  chars: readonly string[];
  /** Ms per character at the start. */
  speedMs: number;
  /** The emote sound's delay, or null when it has none. */
  sfxDelayMs: number | null;
}

/** A looping preanim gives way a little early so its first frames never show again. */
export const PREANIM_MARGIN_MS = 20;
const SPEED_STEP_MS = 20;
const MAX_SPEED_MS = 120;
const PAUSE_UNIT_MS = 100;
const SHAKE_MS = 200;
const FLASH_MS = 400;

/** When each character appears, with blips and inline commands, starting at `start`. */
function textEvents(chars: readonly string[], start: number, initialSpeed: number): { events: TimelineEvent[]; end: number } {
  const events: TimelineEvent[] = [];
  let speed = initialSpeed;
  let t = start;
  let pos = 0;
  while (pos < chars.length) {
    t += speed;
    if (chars[pos] !== " ") events.push({ at: t, kind: "blip" });
    pos++;

    // Runs of { and } change the speed and show nothing; the next character comes in the same step.
    while (pos <= chars.length && (chars[pos - 1] === "{" || chars[pos - 1] === "}")) {
      if (chars[pos - 1] === "}") speed = Math.max(0, speed - SPEED_STEP_MS);
      else speed = Math.min(MAX_SPEED_MS, speed + SPEED_STEP_MS);
      pos++;
    }
    if (pos > chars.length) break;

    const command = chars[pos - 1] === "\\" ? chars[pos] : undefined;
    if (command === "s" || command === "f") {
      pos++;
      events.push({ at: t, kind: command === "s" ? "shake" : "flash" });
      t += command === "s" ? SHAKE_MS : FLASH_MS;
    } else if (command === "p") {
      pos++;
      let digits = "";
      while (pos < chars.length && /^\d$/.test(chars[pos])) digits += chars[pos++];
      t += (parseInt(digits, 10) || 1) * PAUSE_UNIT_MS;
    } else {
      events.push({ at: t, kind: "char", index: pos - 1 });
    }
  }
  return { events, end: t };
}

export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const shoutEnd = input.shoutMs;
  if (input.shoutMs > 0) events.push({ at: 0, kind: "shout" });
  events.push({ at: shoutEnd, kind: "preanim" });
  if (input.sfxDelayMs !== null) events.push({ at: shoutEnd + input.sfxDelayMs, kind: "sfx" });

  const preanimEnd = input.preanimMs > 0 ? shoutEnd + Math.max(0, input.preanimMs - PREANIM_MARGIN_MS) : shoutEnd;
  const textStart = input.nonInterrupting ? shoutEnd : preanimEnd;
  const text = textEvents(input.chars, textStart, input.speedMs);

  if (input.nonInterrupting && input.preanimMs > 0) {
    events.push({ at: textStart, kind: "chatbox" });
    // Text over the preanim: talking only if words are still coming when it ends.
    if (text.end > preanimEnd) events.push({ at: preanimEnd, kind: "talk" });
  } else {
    events.push({ at: textStart, kind: "talk" });
  }
  events.push(...text.events);
  events.push({ at: Math.max(text.end, preanimEnd), kind: "idle" });

  // Stable: events at the same time keep the order they were added in.
  return events.map((e, i) => ({ e, i })).sort((a, b) => a.e.at - b.e.at || a.i - b.i).map(({ e }) => e);
}
