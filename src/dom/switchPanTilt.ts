/** Pans between positions instead of cutting. */
export function applyPanTilt(enabled: boolean) {
  const fullview = document.getElementById("client_fullview");
  if (fullview) fullview.style.transition = enabled ? "0.5s ease-in-out" : "none";
}
