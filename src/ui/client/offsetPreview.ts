import { ref } from "vue";

/** True while the position sliders are being adjusted; the stage shows a ghost sprite. */
export const offsetPreview = ref(false);

let holding = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const hideSoon = (ms: number) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!holding) offsetPreview.value = false;
  }, ms);
};

/** Pointer down on a slider: show until released anywhere. */
export function holdOffsetPreview() {
  holding = true;
  offsetPreview.value = true;
  const release = () => {
    holding = false;
    hideSoon(300);
  };
  window.addEventListener("pointerup", release, { once: true });
  window.addEventListener("pointercancel", release, { once: true });
}

/** Keyboard or wheel nudges: show briefly. */
export function pulseOffsetPreview() {
  offsetPreview.value = true;
  hideSoon(800);
}
