/** 16:9 viewport instead of 4:3. */
export function applyWidescreen(enabled: boolean) {
  const gamewindow = document.getElementById("client_gamewindow");
  if (gamewindow) gamewindow.style.paddingBottom = enabled ? "56.25%" : "75%";
}
