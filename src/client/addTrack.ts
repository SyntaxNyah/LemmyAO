import { client } from "../client";
import { safeHtmlTags } from "../escaping";
import { getFilenameFromPath } from "../utils/paths";

export function addTrack(trackname: string) {
  const newentry = <HTMLOptionElement>document.createElement("OPTION");
  const songName = getFilenameFromPath(trackname);
  // aolib's str field already unescaped chat-meta tokens before we got here.
  newentry.text = safeHtmlTags(songName);
  newentry.value = trackname;
  (<HTMLSelectElement>document.getElementById("client_musiclist")).options.add(
    newentry,
  );
  client.musics.push(trackname);
}

import { createArea } from "./createArea";
import { fix_last_area } from "./fixLastArea";
import { isAudio } from "./isAudio";
import type * as aolib from "../aolib";

/**
 * SM: server pushes the full music + area list at once. Areas come
 * first (until we hit an entry whose name looks like an audio file),
 * then music. The fanta wire-format may leave a trailing empty-name
 * entry from the `#` split; we skip those.
 */
export function applyMusicListBatch(packet: aolib.SMPacket) {
  document.getElementById("client_loadingtext")!.innerHTML = "Loading Music";
  client.resetMusicList();
  client.resetAreaList();
  client.musics_time = false;

  let index = 0;
  for (const { name } of packet.music_list) {
    if (!name) continue;
    if (client.musics_time) {
      addTrack(name);
    } else if (isAudio(name)) {
      client.musics_time = true;
      fix_last_area();
      addTrack(name);
    } else {
      createArea(index, name);
    }
    index++;
  }

  // Music done, carry on
  client.server.send.RD({});
}

/** FM: server pushes the full music list (refresh after edits). */
export function applyFullMusicList(packet: aolib.FMPacket) {
  client.resetMusicList();
  for (const { name } of packet.music_list) {
    if (!name) continue;
    addTrack(name);
  }
}

/**
 * EM: server pushes one incremental music/area batch. Entries before
 * the first audio file are areas; everything after is music. Acks by
 * requesting the next batch.
 */
export function applyEvidenceListBatch(packet: aolib.EMPacket) {
  document.getElementById("client_loadingtext")!.innerHTML = "Loading Music";
  if (packet.batchIndex === 0) {
    client.resetMusicList();
    client.resetAreaList();
    client.musics_time = false;
  }

  for (const { index, name } of packet.entries) {
    if (client.musics_time) {
      addTrack(name);
    } else if (isAudio(name)) {
      client.musics_time = true;
      fix_last_area();
      addTrack(name);
    } else {
      createArea(index, name);
    }
  }
  client.server.send.AM({ batch: packet.batchIndex / 10 + 1 });
}
