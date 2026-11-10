import { CHATBOX, setCHATBOX } from "../client";
import chatbox_arr from "../constants/chatboxes";
import { setSetting } from "../core/settings";

/**
 * Set the style of the chatbox
 */
export function setChatbox(setstyle: string) {
  const chatbox_theme = <HTMLAnchorElement>(
    document.getElementById("chatbox_theme")
  );
  const themeselect = <HTMLSelectElement>(
    document.getElementById("client_chatboxselect")
  );
  setCHATBOX(themeselect.value);

  setSetting("chatbox", CHATBOX);
  if (CHATBOX === "dynamic") {
    const style = setstyle.replace("chat", "");
    if (chatbox_arr.includes(style)) {
      chatbox_theme.href = `styles/chatbox/${style}.css`;
    } else {
      chatbox_theme.href = "styles/chatbox/aa.css";
    }
  } else {
    chatbox_theme.href = `styles/chatbox/${CHATBOX}.css`;
  }
}
