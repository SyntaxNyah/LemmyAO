import type * as aolib from "aolib-ts";
import { MusicChannel } from "aolib-ts";
import { applyBackgroundChange } from "./viewport/utils/setSide";
import { playMusicChange } from "./viewport/utils/playMusic";
import { handleChatMessage } from "./viewport/utils/handleICSpeaking";
import { renderGroupPeers } from "./viewport/groupRender";
import { animateDivergence } from "./divergenceMeter";
import type { GPMember } from "./groupPair";
import type { TPLogLine, TPPacket } from "./teleport";

/**
 * Replays a Teleport snapshot into the existing renderers. TP deliberately does
 * not re-implement rendering: a restore that diverges from live rendering would
 * be a second renderer to keep in sync forever.
 *
 * Deferred for the POC: evidence and testimony. The snapshot carries both, so
 * wiring them is a follow-up (applyEvidenceList / applyTestimonyState), not a
 * protocol change.
 */

// aolib models text colour as a string on the JSON wire; the snapshot carries
// AO's numeric form. The order matches aolib's TextColor enum.
const TEXT_COLORS = [
  "white",
  "green",
  "red",
  "orange",
  "blue",
  "yellow",
  "pink",
  "cyan",
  "grey",
  "rainbow",
] as const;

type TextColorName = (typeof TEXT_COLORS)[number];

function colorName(n: number): TextColorName {
  return TEXT_COLORS[n] ?? "white";
}

// toMS synthesises the MS packet the IC renderer expects from one snapshot line.
// Fields the snapshot does not carry (offsets, effects, pairs) take inert
// defaults so a replayed line cannot shake, flash or re-pair the stage.
function toMS(line: TPLogLine): aolib.packets.MSToClient {
  return {
    $header: "MS",
    desk_modifier: "shown",
    preanim: "",
    character: line.name,
    emote: line.emote,
    message: line.text,
    side: line.side,
    sfx_name: "",
    emote_modifier: "no_preanim",
    char_id: line.char_id,
    sfx_delay: 0,
    shout_modifier: "none",
    evidence_id: 0,
    flip: "none",
    realization: false,
    text_color: colorName(line.color),
    showname: line.showname,
    paired_charid: -1,
    paired_order: 0,
    paired_name: "",
    paired_emote: "",
    offset: { x: 0, y: 0 },
    paired_offset: { x: 0, y: 0 },
    paired_flip: "none",
    noninterrupting_preanim: false,
    sfx_looping: false,
    screenshake: false,
    frames_shake: "",
    frames_realization: "",
    frames_sfx: "",
    additive: false,
    effect: { name: "", folder: "", sound: "" },
  } as unknown as aolib.packets.MSToClient;
}

export async function restoreTeleport(packet: TPPacket): Promise<void> {
  const { area, cast, log } = packet.state;

  // 1. Background + side first: the BN re-stage tears the old scene down, so
  //    everything after this lands on a clean stage (the server commits in the
  //    same order: set_side then set_background).
  applyBackgroundChange({
    $header: "BN",
    background: area.background,
    position: area.side,
  } as aolib.packets.BN);

  // 2. Music, silently: the log below is the snapshot's own transcript, so a
  //    synthetic "changed music to ..." line would forge history.
  if (area.music.name) {
    playMusicChange(
      {
        $header: "MC",
        name: area.music.name,
        char_id: area.music.char_id,
        showname: area.music.showname,
        looping: area.music.looping,
        channel: MusicChannel.music,
        effects: {},
      } as unknown as aolib.packets.MCToClient,
      true,
    );
  }

  // 3. Transcript, oldest first, through the normal IC path so chatbox, blips,
  //    showname and side all behave exactly as they do live.
  for (const line of log) {
    if (!line.text) continue;
    handleChatMessage(toMS(line));
    // Yield so the sprite preloader can settle between lines; a synchronous
    // loop would race the asset cache and drop the later sprites.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // 4. The rest of the cast, drawn behind whoever spoke last. The snapshot's
  //    cast is field-compatible with GP's roster, so the group renderer is
  //    reused rather than duplicated.
  const last = log.length > 0 ? log[log.length - 1] : undefined;
  renderGroupPeers(
    cast as unknown as GPMember[],
    last?.char_id ?? -1,
    last?.side ?? area.side,
  );

  // 5. The divergence meter, last, so its roll lands on a settled stage.
  animateDivergence(packet.divergence);
}
