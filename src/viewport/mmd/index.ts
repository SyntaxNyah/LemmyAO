import type { MmdController } from "./mmdController";

export type { Model3dInfo, MmdState } from "./types";

let controllerPromise: Promise<MmdController | null> | null = null;
let resolved: MmdController | null = null;

/**
 * Lazily constructs the single MMD controller, dynamically importing Babylon
 * only the first time a 3D character is seen so 2D-only sessions never pay
 * for the (large) 3D runtime. Returns null if the runtime fails to load.
 */
export function getMmdController(): Promise<MmdController | null> {
  if (!controllerPromise) {
    controllerPromise = import("./mmdController")
      .then(({ MmdController }): MmdController => {
        resolved = new MmdController();
        return resolved;
      })
      .catch((err): MmdController | null => {
        console.warn("Failed to initialize 3D character runtime:", err);
        return null;
      });
  }
  return controllerPromise;
}

/**
 * Returns the controller only if it has already been created. Used by the
 * teardown path so a plain 2D message never triggers the Babylon import.
 */
export function existingMmdController(): MmdController | null {
  return resolved;
}
