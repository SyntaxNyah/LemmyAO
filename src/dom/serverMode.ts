// `?mode=server`: run the client as its own single-area AO server for local
// character testing, with no real server behind it. The client.ts local-mode
// wiring (acting_as_server) and the replay handshake synthesis do the protocol
// work; this module supplies the server-mode specifics:
//
//   - the character roster comes from the asset folder (the dev server's
//     ./dev-assets, or an absolute `?localasset=<folder>` served via /@local),
//   - the replay playback UI is swapped back for the normal OOC input.
//
// Chat relay (your own IC/OOC/music looping back) lives in registerProtocol so
// it applies to any acting-as-server mode. You drive it: pick a character and
// type. No effect unless mode is `server`.

import { client } from "../client";
import { setAOhost } from "../client/aoHost";
import { buildCharGrid } from "../client/fetchLists";
import { setupCharacterBasic } from "../client/handleCharacterInfo";
import queryParser from "../utils/queryParser";

const { mode } = queryParser();
const localasset = (new URLSearchParams(location.search).get("localasset") ?? "")
  .trim()
  .replace(/\/+$/, "");

// Filesystem path (for /@list) of the asset base's characters/ folder, and the
// asset host the client fetches char.ini / models / sprites from.
const charsDir = localasset ? `${localasset}/characters` : "dev-assets/characters";
const assetHost = localasset ? `${location.origin}/@local${localasset}/` : `${location.origin}/`;

const waitFor = async (pred: () => boolean, timeoutMs = 8000): Promise<boolean> => {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 100));
  }
  return true;
};

async function runServerMode(): Promise<void> {
  setAOhost(assetHost);

  await waitFor(() => !!client?.viewport && Array.isArray(client.chars));

  // Roster from the asset folder (replaces the replay default when available).
  let names: string[] = [];
  try {
    const res = await fetch(`/@list?dir=${encodeURIComponent(charsDir)}`);
    if (res.ok) names = await res.json();
  } catch {
    /* listing unavailable (e.g. a remote host) — keep the replay roster */
  }

  if (names.length > 0) {
    const muteSelect = document.getElementById("mute_select") as HTMLSelectElement | null;
    const pairSelect = document.getElementById("pair_select") as HTMLSelectElement | null;
    if (muteSelect) muteSelect.innerHTML = "";
    if (pairSelect) pairSelect.innerHTML = "";
    client.chars = [];
    client.char_list_length = names.length;
    buildCharGrid(names.length);
    names.forEach((name, i) => setupCharacterBasic([name, "", "", ""], i));
  }

  // Replace the replay playback controls with the normal OOC input.
  const replayControls = document.getElementById("client_replaycontrols");
  const oocInput = document.getElementById("client_oocinput");
  if (replayControls) replayControls.style.display = "none";
  if (oocInput) oocInput.style.display = "";

  document.getElementById("client_charselect")!.style.display = "block";
}

if (mode === "server") {
  runServerMode().catch((err) => console.error("[server]", err));
}
