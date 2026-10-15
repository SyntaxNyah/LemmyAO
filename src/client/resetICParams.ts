import { selectedShout, setSelectedShout } from "../client";
import { isPreanimAlwaysEnabled } from "../dom/switchPreanimAlways";

/**
 * Resets the IC parameters for the player to enter a new chat message.
 * This should only be called when the player's previous chat message
 * was successfully sent/presented.
 */
export function resetICParams() {
  (<HTMLInputElement>document.getElementById("client_inputbox")).value = "";
  document.getElementById("button_flash")!.className = "client_button";
  document.getElementById("button_shake")!.className = "client_button";

  (<HTMLInputElement>document.getElementById("sendpreanim")).checked =
    isPreanimAlwaysEnabled();
  (<HTMLInputElement>document.getElementById("sendsfx")).checked = false;

  if (selectedShout) {
    document.getElementById(`button_${selectedShout}`)!.className =
      "client_button";
    setSelectedShout(0);
  }
}
