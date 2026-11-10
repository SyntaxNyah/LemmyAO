import { els } from "../elements";
import { createMusic, type MusicChannels } from "./createMusic";
import { AO_HOST } from "../../client/aoHost";
import { MusicChannel } from "aolib-ts";
import type * as aolib from "aolib-ts";

let music: MusicChannels | undefined;
const channels = () => (music ??= createMusic());

/** Switches a music channel to the announced track. */
export function playMusicTrack(packet: aolib.packets.MCToClient) {
  const music = channels()[packet.channel];
  music.pause();
  // An empty track name is a stop, not a track: building a URL from it would
  // point the channel at the music directory and error on every attempt.
  if (packet.name) {
    if (packet.name.startsWith("http")) {
      music.src = packet.name;
    } else {
      music.src = `${AO_HOST}sounds/music/${encodeURI(packet.name.toLowerCase())}`;
    }
    music.loop = packet.looping;
    music.play().catch(() => {});
  } else {
    music.removeAttribute("src");
  }
  els.trackStatusText.innerText = packet.name;
}

/** RMC (undocumented): seek the music channel to `toTime` seconds. */
export function seekMusic(toTime: number) {
  const music = channels()[MusicChannel.music];
  music.pause();
  const requestedAt = Date.now() / 1000;
  music.addEventListener(
    "loadedmetadata",
    () => {
      // Seek to the requested offset plus however long the track took to load.
      music.currentTime = toTime + (Date.now() / 1000 - requestedAt);
      music.play().catch(() => {});
    },
    { once: true },
  );
}
