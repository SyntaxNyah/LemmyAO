/**
 * Triggered by the change aspect ratio checkbox
 */
/** 16:9 stage instead of 4:3. */
export function applyWidescreen(enabled: boolean) {
  const gamewindow = document.getElementById("client_gamewindow");
  if (gamewindow) gamewindow.style.paddingBottom = enabled ? "56.25%" : "75%";
}

export async function switchAspectRatio() {
  const background = document.getElementById("client_gamewindow")!;
  const offsetCheck = <HTMLInputElement>(
    document.getElementById("client_hdviewport_offset")
  );
  if (
    (<HTMLInputElement>document.getElementById("client_hdviewport")).checked
  ) {
    background.style.paddingBottom = "56.25%";
    offsetCheck.disabled = false;
  } else {
    background.style.paddingBottom = "75%";
    offsetCheck.disabled = true;
  }
}
