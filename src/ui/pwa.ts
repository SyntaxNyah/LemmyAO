import { computed, ref } from "vue";
import { registerSW } from "virtual:pwa-register";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;

const standalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** The browser offered to install the app (Chromium-based browsers). */
export const installable = ref(false);
export const installed = ref(standalone());
/** iOS has no install prompt; people add it from the Share menu instead. */
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const showIosHint = computed(() => ios && !installed.value);
/** A new version is downloaded and waits for a reload. */
export const updateReady = ref(false);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  installable.value = true;
});

window.addEventListener("appinstalled", () => {
  deferred = null;
  installable.value = false;
  installed.value = true;
});

export async function install() {
  if (!deferred) return;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  installable.value = false;
  if (outcome === "accepted") installed.value = true;
}

const updateSW = import.meta.env.PROD ? registerSW({ onNeedRefresh: () => (updateReady.value = true) }) : undefined;

/** Activates the waiting version and reloads the page. */
export const applyUpdate = () => updateSW?.(true);
