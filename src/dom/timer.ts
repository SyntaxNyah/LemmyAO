import { TimerCommand } from "aolib-ts";
import type * as aolib from "aolib-ts";

/**
 * TI: timer state update. `command` selects the action:
 *   0 / 1 = set displayed time (`time` ms)
 *   2 = show the timer
 *   3 = hide the timer
 */
export function applyTimerUpdate(packet: aolib.packets.TI) {
  switch (packet.command) {
    case TimerCommand.start:
    case TimerCommand.pause:
      document.getElementById(`client_timer${packet.timer_id}`)!.innerText =
        String(packet.time);
      break;
    case TimerCommand.show:
      document.getElementById(`client_timer${packet.timer_id}`)!.style.display = "";
      break;
    case TimerCommand.hide:
      document.getElementById(`client_timer${packet.timer_id}`)!.style.display = "none";
      break;
  }
}
