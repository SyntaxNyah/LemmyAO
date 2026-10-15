import { client } from "../client";
/**
 * Highlights and selects an emotion for in-character chat.
 * @param {string} emo the new emotion to be selected
 */
export function pickEmotion(emo: number) {
  try {
    if (client.selectedEmote !== -1) {
      document.getElementById(`emo_${client.selectedEmote}`)!.className =
        "emote_button";
    }
  } catch (err) {
    // do nothing
  }
  client.selectedEmote = emo;
  document.getElementById(`emo_${emo}`)!.className = "emote_button dark";

  (<HTMLInputElement>document.getElementById("sendsfx")).checked =
    client.emote.sfx.length > 1;

  // A preanim sprite exists when char.ini names one (anything but "-"/"").
  // Turning it on here means the selected emote's preanimation plays for its
  // first message; resetICParams clears it afterwards so it doesn't replay.
  const preanim = client.emote.preanim;
  (<HTMLInputElement>document.getElementById("sendpreanim")).checked =
    !!preanim && preanim !== "-" && preanim !== "";

  (<HTMLInputElement>document.getElementById("client_inputbox")).focus();
}
