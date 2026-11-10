import { settings } from "../core/settings";

/**
 * Returns whether the user has chosen to hide courtroom desks.
 * Defaults to `false` so desks always show unless the user opts in.
 */
export function isHideDesksEnabled(): boolean {
  return settings.hideDesks;
}

export function applyHideDesks(enabled: boolean) {
  const benches = ["client_def_bench", "client_wit_bench", "client_pro_bench", "client_bench_classic"];
  for (const id of benches) {
    const bench = <HTMLImageElement | null>document.getElementById(id);
    if (bench) bench.style.opacity = enabled ? "0" : "1";
  }
}
