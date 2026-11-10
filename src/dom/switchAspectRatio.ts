/** 16:9 stage instead of 4:3. */
export function applyWidescreen(enabled: boolean) {
  const gamewindow = document.getElementById("client_gamewindow");
  if (gamewindow) gamewindow.style.paddingBottom = enabled ? "56.25%" : "75%";
}
