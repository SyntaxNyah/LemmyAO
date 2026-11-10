import { positions } from "../constants/positions";
import { element, els } from "../elements";
import { AO_HOST } from "../../client/aoHost";
import { client } from "../../client";
import { isFullView, Side } from "aolib-ts";
import transparentPng from "../../constants/transparentPng";
import fileExists from "../../utils/fileExists";
import { isHideDesksEnabled } from "../../dom/switchHideDesks";

export async function setBackgroundImage(elementid: string, bgname: string, bgpart: string) {

  let url;
  let success = false;
  for (const extension of client.background_extensions) {
    url = `${AO_HOST}background/${encodeURI(bgname.toLowerCase())}/${bgpart}${extension}`;
    const exists = await fileExists(url);

    if (exists) {
      success = true;
      break;
    }
  }
  if (success)
    element<HTMLImageElement>(elementid).src = url;
  else
    element<HTMLImageElement>(elementid).src = transparentPng;
  return success;
}


/**
 * Changes the viewport background based on a given position. Unknown
 * positions fall back to a generic backdrop using the position string as
 * the bg filename stem.
 */
export async function set_side({
  position,
  showSpeedLines,
  showDesk,
}: {
  position: Side;
  showSpeedLines: boolean;
  showDesk: boolean;
}) {
  const view = els.fullView;
  const fullView = isFullView(position);

  const bench = element<HTMLImageElement>(fullView ? `client_${position}_bench` : "client_bench_classic");
  const court = element<HTMLImageElement>(fullView ? `client_court_${position}` : "client_court_classic");

  let bg;
  let desk;
  let speedLines;

  if (position in positions) {
    bg = positions[position].bg;
    desk = positions[position].desk;
    speedLines = positions[position].speedLines;
  } else {
    bg = `${position}`;
    desk = { ao2: `${position}_overlay`, ao1: "_overlay" };
    speedLines = "defense_speedlines.gif";
  }

  if (showSpeedLines === true) {
    court.src = `${AO_HOST}themes/default/${encodeURI(speedLines)}`;
  } else {
    setBackgroundImage(court.id, viewportState.backgroundName, bg);
  }

  if (isHideDesksEnabled()) {
    showDesk = false;
  }

  if (showDesk === true && desk) {
    const bg_folder = backgroundFolder();
    const stems = [desk.ao2, desk.ao1].filter((s): s is string => typeof s === "string");
    let found = false;
    outer:
    for (const stem of stems) {
      for (const ext of client.background_extensions) {
        const url = `${bg_folder}${stem}${ext}`;
        if (await fileExists(url)) {
          bench.src = url;
          bench.style.opacity = "1";
          found = true;
          break outer;
        }
      }
    }
    if (!found) {
      bench.src = transparentPng;
    }
  } else {
    bench.style.opacity = "0";
  }

  if (fullView) {
    view.style.display = "";
    els.classicView.style.display = "none";
    switch (position) {
      case Side.def:
        view.style.left = "0";
        break;
      case Side.wit:
        view.style.left = "-200%";
        break;
      case Side.pro:
        view.style.left = "-400%";
        break;
    }
  } else {
    view.style.display = "none";
    els.classicView.style.display = "";
  }
}

import { applyPanTilt } from "../../dom/switchPanTilt";
import { settings } from "../../core/settings";
import { state } from "../../core/state";
import { draft } from "../../core/commands";
import { safeHtmlTags } from "../../escaping";
import { backgroundFolder, viewportState } from "../state";

/** Swaps every background slot in the viewport. */
export function showBackground(background: string) {
  viewportState.backgroundName = safeHtmlTags(background);
  const packet = { background };
  setBackgroundImage("client_def_bench", packet.background, "defensedesk");
  setBackgroundImage("client_wit_bench", packet.background, "stand");
  setBackgroundImage("client_pro_bench", packet.background, "prosecutiondesk");
  setBackgroundImage("client_court_def", packet.background, "defenseempty");
  setBackgroundImage("client_court_wit", packet.background, "witnessempty");
  setBackgroundImage("client_court_pro", packet.background, "prosecutorempty");
  setBackgroundImage("client_court_deft", packet.background, "transition_def");
  setBackgroundImage("client_court_prot", packet.background, "transition_pro");
  setBackgroundImage("client_court", packet.background, "court");

  if (els.court.src !== transparentPng) {
    if (settings.panTilt) applyPanTilt(true);
  }

  set_side({
    position: state.self.charId === -1 ? Side.jud : draft.side,
    showSpeedLines: false,
    showDesk: true,
  });
}
