import { client } from "../client";
import { AO_HOST } from "./aoHost";
import { ensureCharIni } from "./handleCharacterInfo";
import { pickEmotion } from "../dom/pickEmotion";
import { attachSpritePreview } from "../dom/spritePreview";
import { updateActionCommands } from "../dom/updateActionCommands";
import fileExists from "../utils/fileExists";
import type * as aolib from "../aolib";

/** PV: server assigns a character to this player. */
export function applyCharacterPick(packet: aolib.PV) {
  changeChar(packet.char_id);
}

/**
 * Switch the player to a different character. Loads the char's ini,
 * rebuilds the emote panel by probing button extensions, and toggles
 * the "custom" button based on whether a custom anim exists.
 *
 * Called by `receivePV` (server-assigned character) and by `iniedit`
 * (in-place ini reload).
 */
export async function changeChar(char_id: number) {
  client.charID = char_id;
  document.getElementById("client_waiting")!.style.display = "none";
  document.getElementById("client_charselect")!.style.display = "none";

  const me = client.chars[client.charID];
  client.selectedEmote = -1;
  const { emotes } = client;
  const emotesList = document.getElementById("client_emo");
  emotesList.style.display = "";
  emotesList.innerHTML = ""; // Clear emote box
  const ini = await ensureCharIni(client.charID);
  me.side = (ini.options.side || "def").toLowerCase();
  updateActionCommands(me.side);
  if (ini.emotes.length === 0) {
    emotesList.innerHTML = `<span
						id="emo_0"
						alt="unavailable"
						class="emote_button">No emotes available</span>`;
  } else {
    // Probe extensions once using button1_off, then reuse for all emotes
    const charPath = `${AO_HOST}characters/${encodeURI(me.name.toLowerCase())}/emotions/`;
    let emoteExtension = client.emotions_extensions[0];
    for (const extension of client.emotions_extensions) {
      if (await fileExists(`${charPath}button1_off${extension}`)) {
        emoteExtension = extension;
        break;
      }
    }

    // aolib-ts emotes carry no numeric id; button files are 1-based by order.
    ini.emotes.forEach((emote: any, idx: number) => {
      const i = idx + 1;
      try {
        const url = `${charPath}button${i}_off${emoteExtension}`;

        // `anim`/`preanim` are a legacy stem or (block format) a full filename
        // with extension; null preanim means none. Lowercased for asset lookup.
        emotes[i] = {
          desc: (emote.name ?? "").toLowerCase(),
          preanim: (emote.preanim ?? "-").toLowerCase(),
          emote: (emote.anim ?? "").toLowerCase(),
          zoom: emote.modifier ?? 0,
          desk_modifier: emote.deskmod ?? 1,
          sfx: (emote.sound ?? "0").toLowerCase(),
          // sounddelayms is [soundt] ticks already converted to ms (aolib-ts
          // TICK_MS == UPDATE_INTERVAL), matching the tickTimer comparison.
          sfxdelay: emote.sounddelayms ?? 0,
          frame_screenshake: "",
          frame_realization: "",
          frame_sfx: "",
          button: url,
        };

        addEmoteButton(i, url, emotes[i].desc, me.name.toLowerCase(), emotes[i].emote);

        if (i === 1) pickEmotion(1);
      } catch (e) {
        console.error(`missing emote ${i}`);
      }
    });
  }

  const customCharPath = `${AO_HOST}characters/${encodeURI(me.name.toLowerCase())}/custom`;
  const customExtensions = [".gif", ".webp", ".apng", ".png"];
  const customExists = (
    await Promise.all(customExtensions.map((ext) => fileExists(`${customCharPath}${ext}`)))
  ).some(Boolean);
  document.getElementById("button_4")!.style.display = customExists ? "" : "none";
}

function addEmoteButton(
  i: number,
  imgurl: string,
  desc: string,
  charactername: string,
  emotename: string,
) {
  const emotesList = document.getElementById("client_emo");
  const emote_item = new Image();
  emote_item.id = "emo_" + i;
  emote_item.className = "emote_button";
  emote_item.src = imgurl;
  emote_item.alt = desc;
  emote_item.onclick = () => {
    pickEmotion(i);
  };
  emotesList.appendChild(emote_item);
  attachSpritePreview(emote_item, charactername, emotename, desc);
}
