import { client } from "../../client";
import { AO_HOST } from "../../client/aoHost";
import { appendICLog } from "../../client/appendICLog";
import { MusicChannel } from "aolib-ts";
import type * as aolib from "aolib-ts";

/** MC: server announces a music change; switch the channel and log it. */
export function playMusicChange(packet: aolib.packets.MCToClient) {
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

  const musicname: string | undefined = client.chars[packet.char_id]?.name;
  const looptext = packet.looping ? "(looping)" : "";
  if (musicname) {
    appendICLog(`changed music to ${packet.name} ${looptext}`, packet.showname, musicname);
  } else {
    appendICLog(`The music was changed to ${packet.name} ${looptext}`, packet.showname);
  }

  document.getElementById("client_trackstatustext")!.innerText = packet.name;
}

/**
 * RMC: music seek to a specific offset. Undocumented; not in the
 * official Packet Reference. `toTime` is a seconds string the legacy
 * audio element parses with `parseFloat`.
 */
export function applyMusicSeek(packet: aolib.packets.RMC) {
  const music = client.viewport.music[MusicChannel.music];
  music.pause();
  const toTime = parseFloat(packet.toTime);
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
