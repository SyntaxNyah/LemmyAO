import type * as aolib from "aolib-ts";
import { prepareMessage } from "./prepare";
import { setScene } from "./scene";
import { playTimeline } from "./player";

// Messages prepare in parallel but play in the order they arrived.
let queue: Promise<void> = Promise.resolve();

/** Plays an IC message. Core has already dropped duplicates and muted characters. */
export function playICMessage(packet: aolib.packets.MSToClient) {
  const prepared = prepareMessage(packet);
  queue = queue
    .then(() => prepared)
    .then(({ chatmsg, timeline, sounds }) => playTimeline(chatmsg, timeline, sounds, () => setScene(chatmsg)))
    .catch((err) => console.error("Could not play IC message", err));
}
