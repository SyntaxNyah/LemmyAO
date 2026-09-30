import { client, selectedShout } from "../client";
import * as aolib from "aolib-ts";
import { enumByNumber } from "../utils/aoEnum";

const input = (id: string) =>
  document.getElementById(id) as HTMLInputElement;
const isToggled = (id: string) =>
  document.getElementById(id)!.classList.contains("dark");

/**
 * Triggered when the Return key is pressed on the in-character chat input box.
 */
export function onICEnter(event: KeyboardEvent) {
  if (event.key !== "Enter") return false;

  const my_char = client.character;
  const my_emote = client.emote;
  const sendSfx = input("sendsfx").checked;
  const sendPreanim = input("sendpreanim").checked;

  // char.ini modifier is numeric (0/1/5/6); the sendpreanim toggle only flips
  // between no_preanim and preanim, leaving zoom/objection variants alone.
  let modN = Number(my_emote.zoom);
  if (!Number.isInteger(modN)) modN = 0;
  if (sendPreanim && modN === 0) modN = 1;
  else if (!sendPreanim && modN === 1) modN = 0;
  const emote_modifier = enumByNumber(aolib.EmoteModifier, modN);

  const sideStr = input("role_select").value || my_char.side;
  const side: aolib.Side = (Object.values(aolib.Side) as string[]).includes(sideStr)
    ? (sideStr as aolib.Side)
    : aolib.Side.wit;

  const colorN = Number(input("textcolor").value);
  const text_color =
    Number.isInteger(colorN) && colorN >= 0 && colorN <= 9
      ? enumByNumber(aolib.TextColor, colorN)
      : aolib.TextColor.white;

  client.server.send.MS({
    desk_modifier: enumByNumber(aolib.DeskModifier, Number(my_emote.desk_modifier)),
    preanim: my_emote.preanim,
    character: my_char.name,
    emote: my_emote.emote,
    message: input("client_inputbox").value,
    side,
    sfx_name: sendSfx ? my_emote.sfx : "0",
    emote_modifier,
    char_id: client.charID,
    sfx_delay: sendSfx ? my_emote.sfxdelay : 0,
    shout_modifier: enumByNumber(aolib.ShoutModifier, selectedShout),
    evidence_id: client.evidence + 1,
    flip: isToggled("button_flip") ? aolib.Flip.horizontal : aolib.Flip.none,
    realization: isToggled("button_flash"),
    text_color,
    showname: input("ic_chat_name").value,
    paired_charid: Number(input("pair_select").value) || -1,
    offset: {
      x: Number(input("pair_offset").value) || 0,
      y: Number(input("pair_y_offset").value) || 0,
    },
    noninterrupting_preanim: input("check_nonint").checked,
    sfx_looping: input("check_loopsfx").checked,
    screenshake: isToggled("button_shake"),
    frames_shake: "-",
    frames_realization: "-",
    frames_sfx: "-",
    additive: input("check_additive").checked,
    effect: input("effect_select").value,
  });

  return false;
}
