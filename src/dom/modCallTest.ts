import { emit } from "../core/events";
import { logOOC } from "../core/log";

/** Triggered by the modcall sfx dropdown: preview the modcall alert. */
export function modcall_test() {
  logOOC({ kind: "modcall", message: "test", time: Date.now() });
  emit("modcall", "test");
}
