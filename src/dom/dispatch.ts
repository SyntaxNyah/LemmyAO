/**
 * DOM -> TS dispatch via `data-action` attributes, for the markup that is
 * still plain HTML: the stage, the connection error overlay and voice chat.
 *
 * The default event is "click"; override with `data-event="error"` etc.
 * One delegated listener per event type, registered in capture phase so
 * non-bubbling events (`error`) work the same way.
 */
import { charError } from "./charError";
import { imgError } from "./imgError";
import { opusCheck } from "./opusCheck";
import { ReconnectButton } from "./reconnectButton";
import { toggleVoice } from "./toggleVoice";

const actions: Record<string, (e: Event) => void> = {
  ReconnectButton: () => ReconnectButton(),
  toggleVoice: () => toggleVoice(),
  imgError: (e) => imgError(e.currentTarget as HTMLImageElement),
  charError: (e) => charError(e.currentTarget as HTMLImageElement),
  opusCheck: (e) => opusCheck(e.currentTarget as HTMLAudioElement),
};

for (const type of ["click", "error"] as const) {
  document.addEventListener(
    type,
    (e) => {
      const target = e.target as Element | null;
      if (!target || typeof target.closest !== "function") return;
      const el = target.closest<HTMLElement>("[data-action]");
      if (!el || (el.dataset.event ?? "click") !== type) return;
      const fn = actions[el.dataset.action!];
      if (!fn) {
        console.warn(`Unknown data-action: ${el.dataset.action}`);
        return;
      }
      // currentTarget should be the element carrying data-action, even when
      // the event fired on a descendant.
      Object.defineProperty(e, "currentTarget", { value: el, configurable: true });
      fn(e);
    },
    true,
  );
}
