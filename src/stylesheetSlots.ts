// Stylesheet links whose hrefs are set at runtime (chatbox, mod UI, effects); they must exist before anything else runs.
for (const id of [
  "chatbox_theme",
  "nameplate_setting",
  "mod_ui",
  "effect_css",
]) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.id = id;
  // A real (empty) href so the document doesn't stay `interactive`.
  link.href = "data:text/css,";
  document.head.appendChild(link);
}
