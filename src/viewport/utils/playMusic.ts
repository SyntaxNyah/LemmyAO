import { client } from "../../client";
import { AO_HOST } from "../../client/aoHost";
import { appendICLog } from "../../client/appendICLog";
import { MusicChannel } from "aolib-ts";
import type * as aolib from "aolib-ts";

/** Switches a music channel to the announced track. */
export function playMusicTrack(packet: aolib.packets.MCToClient) {
  const music = client.viewport.music[packet.channel];
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
  document.getElementById("client_trackstatustext")!.innerText = packet.name;
}

/** MC: log the music change. The stage plays it. */
export function playMusicChange(packet: aolib.packets.MCToClient) {
  const musicname: string | undefined = client.chars[packet.char_id]?.name;
  const looptext = packet.looping ? "(looping)" : "";
  if (musicname) {
    appendICLog(`changed music to ${packet.name} ${looptext}`, packet.showname, musicname);
  } else {
    appendICLog(`The music was changed to ${packet.name} ${looptext}`, packet.showname);
  }
}

/** RMC (undocumented): seek the music channel to `toTime` seconds. */
export function seekMusic(toTime: number) {
  const music = client.viewport.music[MusicChannel.music];
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
