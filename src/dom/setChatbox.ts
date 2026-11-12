import { setCHATBOX } from "../client";
import chatbox_arr from "../constants/chatboxes";
import { settings } from "../core/settings";

/** Applies the speaker's chatbox style, falling back to the theme's default. */
export function setChatbox(setstyle: string) {
  const own = setstyle.replace("chat", "");
  // Classic keeps the old client's AA box as the fallback.
  const style = chatbox_arr.includes(own) ? own : settings.theme === "classic" ? "aa" : "default";
  setCHATBOX(style);
  (document.getElementById("chatbox_theme") as HTMLLinkElement).href = `styles/chatbox/${style}.css`;
}
