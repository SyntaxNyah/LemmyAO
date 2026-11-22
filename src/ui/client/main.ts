import { createApp } from "vue";
import "../styles/base.css";
import "../theme";
import "../pwa";
import "./preloadArea";
import { reloadSettings } from "../../core/settings";
import { LAYOUT_TIME_KEY, syncSharedLayout } from "./layoutStorage";
import App from "./App.vue";

// localStorage is keyed by scheme; the cookie mirror lets http and https share one layout.
syncSharedLayout();
window.addEventListener("focus", syncSharedLayout);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncSharedLayout();
});
// Another tab on this scheme saved a layout; don't overwrite it with this tab's stale state.
window.addEventListener("storage", (event) => {
  if (
    event.key === null ||
    event.key === "panelLayout" ||
    event.key === "layoutViewportPortrait" ||
    event.key === LAYOUT_TIME_KEY
  ) {
    reloadSettings();
  }
});

createApp(App).mount("#app");
