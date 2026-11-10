import type { packets } from "aolib-ts";

export interface CoreEvents {
  /** The socket opened; the handshake is starting. */
  opened: void;
  /** The socket closed or failed to open. */
  closed: { code: number; reason: string };
  /** The handshake finished and the area/character lists are loaded. */
  joined: void;
  /** An in-character message for the stage to play. */
  icMessage: packets.MSToClient;
  /** A moderator was called. */
  modcall: string;
  /** The server asked to seek the music channel to this many seconds. */
  musicSeek: number;
  /** A track started or stopped on a channel. */
  music: packets.MCToClient;
  /** The background changed (or was re-sent). */
  background: string;
  /** A judge animation to play; end_animation clears it. */
  testimony: packets.RTToClient["animation"];
}

type Listener<T> = (payload: T) => void;

const listeners = new Map<keyof CoreEvents, Set<Listener<never>>>();

/** Subscribes to a core event; returns the unsubscribe function. */
export function on<K extends keyof CoreEvents>(name: K, fn: Listener<CoreEvents[K]>) {
  let set = listeners.get(name);
  if (!set) listeners.set(name, (set = new Set()));
  set.add(fn as Listener<never>);
  return () => set.delete(fn as Listener<never>);
}

export function emit<K extends keyof CoreEvents>(
  name: K,
  ...payload: CoreEvents[K] extends void ? [] : [CoreEvents[K]]
) {
  listeners.get(name)?.forEach((fn) => {
    try {
      (fn as Listener<CoreEvents[K]>)(payload[0] as CoreEvents[K]);
    } catch (err) {
      console.error(`[core] ${name} listener threw:`, err);
    }
  });
}
