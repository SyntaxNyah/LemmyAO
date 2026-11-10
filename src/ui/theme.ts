import { effect } from "@vue/reactivity";
import { settings } from "../core/settings";

/** Applies the theme and accent colour settings to the page. */
effect(() => {
  const root = document.documentElement;
  if (settings.theme === "classic") root.dataset.theme = "classic";
  else delete root.dataset.theme;

  if (settings.accent) {
    root.style.setProperty("--accent", settings.accent);
    root.style.setProperty("--accent-hover", `color-mix(in srgb, ${settings.accent} 80%, white)`);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-hover");
  }
});
