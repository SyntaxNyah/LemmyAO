import { selectedShout, setSelectedShout } from "../client";

/**
 * Highlights and selects a shout for in-character chat.
 * If the same shout button is selected, then the shout is canceled.
 * `shout` is the numeric DOM index (data-shout / button_N).
 */
export function toggleShout(shout: number) {
  if (shout === selectedShout) {
    document.getElementById(`button_${shout}`)!.className = "client_button";
    setSelectedShout(0);
  } else {
    document.getElementById(`button_${shout}`)!.className =
      "client_button dark";
    if (selectedShout) {
      document.getElementById(`button_${selectedShout}`)!.className =
        "client_button";
    }
    setSelectedShout(shout);
  }
}
