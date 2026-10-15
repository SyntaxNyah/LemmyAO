/**
 * Persistent "preanimation always on" toggle.
 *
 * When enabled, the per-message Preanimation checkbox defaults to checked for
 * every message instead of following the emote's zoom modifier (or resetting
 * to off after each send). This helps characters whose sprites ship a
 * preanimation but whose char.ini doesn't mark it as the default emote.
 */

/**
 * Returns whether the user has chosen to keep preanimation always on.
 * Defaults to `false` so preanimations follow the emote's own setting.
 */
export function isPreanimAlwaysEnabled(): boolean {
  return localStorage.getItem("preanimAlways") === "true";
}

/**
 * Triggered by the "Always on" checkbox next to Preanimation.
 * Persists the choice and, when enabled, immediately checks the per-message
 * Preanimation checkbox so the current message follows the new default too.
 */
export function switchPreanimAlways() {
  const checkbox = <HTMLInputElement>(
    document.getElementById("sendpreanim_always")
  );
  const enabled = !!checkbox?.checked;
  localStorage.setItem("preanimAlways", enabled ? "true" : "false");

  if (enabled) {
    const sendPreanim = <HTMLInputElement>(
      document.getElementById("sendpreanim")
    );
    if (sendPreanim) sendPreanim.checked = true;
  }
}
