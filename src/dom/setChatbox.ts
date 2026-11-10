import { CHATBOX, setCHATBOX } from "../client";
import chatbox_arr from "../constants/chatboxes";
import { settings } from "../core/settings";

/**
 * Applies the chatbox style setting; "dynamic" uses the speaker's own style.
 */
export function setChatbox(setstyle: string) {
  const chatbox_theme = <HTMLAnchorElement>(
    document.getElementById("chatbox_theme")
  );
  setCHATBOX(settings.chatbox);
  if (CHATBOX === "dynamic") {
    const style = setstyle.replace("chat", "");
    if (chatbox_arr.includes(style)) {
      chatbox_theme.href = `styles/chatbox/${style}.css`;
    } else {
      chatbox_theme.href = "styles/chatbox/default.css";
    }
  } else {
    chatbox_theme.href = `styles/chatbox/${CHATBOX}.css`;
  }
}
