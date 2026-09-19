// Dev-only courtroom demo for 3D characters. Activated with
// `?demo3d=<charFolder>&mode=replay&asset=<host>`; drives the real IC
// message pipeline (handle_ic_speaking -> renderICMessage -> chat_tick)
// so a 3D character renders and lip-syncs in the actual courtroom viewport,
// with no server. No effect unless `demo3d` is present.

import { client } from "../client";
import { handle_ic_speaking } from "../viewport/utils/handleICSpeaking";
import { Side } from "../aolib";
import type * as aolib from "../aolib";

const charFolder = new URLSearchParams(location.search).get("demo3d");

const LINES = [
  "Hold on. Something about this testimony doesn't add up.",
  "Let me lay it out plainly, one contradiction at a time.",
  "This is a 3D character, lip-syncing in the courtroom viewport.",
];

const buildPacket = (character: string, message: string): aolib.MSBroadcast =>
  ({
    desk_modifier: 1,
    preanim: "",
    character,
    emote: "normal",
    message,
    side: Side.WITNESS,
    sfx_name: "",
    emote_modifier: 0,
    char_id: 0,
    sfx_delay: 0,
    shout_modifier: 0,
    evidence_id: 0,
    flip: 0,
    realization: false,
    text_color: 0,
    showname: "",
    paired_charid: -1,
    paired_name: "",
    paired_emote: "",
    offset: { x: 0, y: 0 },
    paired_offset: { x: 0, y: 0 },
    paired_flip: 0,
    noninterrupting_preanim: false,
    sfx_looping: false,
    screenshake: false,
    frames_shake: "",
    frames_realization: "",
    frames_sfx: "",
    additive: false,
    effect: "",
  }) as unknown as aolib.MSBroadcast;

const waitFor = async (pred: () => boolean, timeoutMs = 8000): Promise<boolean> => {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 100));
  }
  return true;
};

async function runDemo(name: string): Promise<void> {
  // Wait for the client + replay handshake to build the viewport and roster.
  await waitFor(() => !!client?.viewport && Array.isArray(client.chars));

  // Install our 3D character as char 0 (ensureCharIni will fetch its char.ini
  // from the asset host and pick up the `model =` key).
  client.chars[0] = {
    name: name,
    showname: name,
    desc: "",
    blips: "male",
    gender: "male",
    side: Side.WITNESS,
    chat: "",
    evidence: "",
    icon: "",
    muted: false,
    inifile: null,
  };

  // Reveal the courtroom, hide the character-select / waiting overlays.
  for (const id of ["client_charselect", "client_waiting"]) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  client.viewport.setBackgroundName("gs4");

  // Loop through a few lines so the lip-sync is visible.
  let i = 0;
  const next = async (): Promise<void> => {
    await handle_ic_speaking(buildPacket(name, LINES[i % LINES.length]));
    i++;
    setTimeout(next, 6000);
  };
  await next();
}

if (charFolder) {
  runDemo(charFolder).catch((err) => console.error("[demo3d]", err));
}
