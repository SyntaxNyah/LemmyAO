import { client, selectedShout } from "../client";
import * as aolib from "aolib-ts";
import { enumByNumber } from "../utils/aoEnum";
import { parsePairedCharID } from "../utils/pairCharID";
import { getPairOrder } from "./pairOrder";
import { draft, sendIC } from "../core/commands";

const input = (id: string) =>
  document.getElementById(id) as HTMLInputElement;
const isToggled = (id: string) =>
  document.getElementById(id)!.classList.contains("dark");

/**
 * Triggered when the Return key is pressed on the in-character chat input box.
 * Copies the legacy controls into the core draft and sends it.
 */
export function onICEnter(event: KeyboardEvent) {
  if (event.key !== "Enter") return false;

  const my_char = client.character;
  const my_emote = client.emote;
  if (!my_char || !my_emote) return false;

  // aolib's parseCharIni already maps legacy numeric modifiers to enum names.
  draft.emote = {
    preanim: my_emote.preanim,
    anim: my_emote.emote,
    modifier: my_emote.zoom,
    deskModifier: my_emote.desk_modifier,
    sfx: my_emote.sfx,
    sfxDelay: my_emote.sfxdelay,
  };

  const sideStr = input("role_select").value || my_char.side;
  draft.side = (Object.values(aolib.Side) as string[]).includes(sideStr)
    ? (sideStr as aolib.Side)
    : aolib.Side.wit;

  const colorN = Number(input("textcolor").value);
  draft.color =
    Number.isInteger(colorN) && colorN >= 0 && colorN <= 9
      ? enumByNumber(aolib.TextColor, colorN)
      : aolib.TextColor.white;

  const [name = "", folder = "", sound = ""] = input("effect_select").value.split("|");

  Object.assign(draft, {
    message: input("client_inputbox").value,
    showname: input("ic_chat_name").value,
    shout: enumByNumber(aolib.ShoutModifier, selectedShout),
    evidence: client.evidence,
    flip: isToggled("button_flip"),
    flash: isToggled("button_flash"),
    screenshake: isToggled("button_shake"),
    sendPreanim: input("sendpreanim").checked,
    sendSfx: input("sendsfx").checked,
    nonInterrupting: input("check_nonint").checked,
    loopSfx: input("check_loopsfx").checked,
    additive: input("check_additive").checked,
    effect: { name, folder, sound },
    pair: {
      charId: parsePairedCharID(input("pair_select").value),
      order: getPairOrder(),
      offset: {
        x: Number(input("pair_offset").value) || 0,
        y: Number(input("pair_y_offset").value) || 0,
      },
    },
  });

  sendIC();
  return false;
}
