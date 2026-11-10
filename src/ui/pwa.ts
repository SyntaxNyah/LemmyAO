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
// iOS browsers can't prompt to install; people add the page from the Share menu instead.
const ua = navigator.userAgent;
const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const iosSteps = /CriOS|EdgiOS/.test(ua)
  ? "Tap Share in the address bar, then Add to Home Screen."
  : /FxiOS/.test(ua)
    ? "Open the menu, tap Share, then Add to Home Screen."
    : "Tap Share, then Add to Home Screen.";

const DISMISS_KEY = "installHintDismissed";
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};
const hintDismissed = ref(readDismissed());

/** How to install on iOS, or "" when it doesn't apply. */
export const iosInstallSteps = computed(() => (ios && !installed.value ? iosSteps : ""));
/** The iOS steps as a card on the server list, until dismissed. */
export const showIosHint = computed(() => !!iosInstallSteps.value && !hintDismissed.value);

export function dismissIosHint() {
  hintDismissed.value = true;
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Storage blocked; it stays hidden for this visit.
  }
}
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
