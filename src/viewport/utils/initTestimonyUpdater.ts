import { Testimony } from "../interfaces/Testimony";
import { client, UPDATE_INTERVAL } from "../../client";
/**
 * Intialize testimony updater
 */
export function initTestimonyUpdater() {
  const testimonyFilenames: Testimony = {
    1: "witnesstestimony",
    2: "crossexamination",
    3: "notguilty",
    4: "guilty",
  };

  const testimony = testimonyFilenames[client.testimonyID];
  if (!testimony) {
    console.warn(`Invalid testimony ID ${client.testimonyID}`);
    return;
  }

  client.viewport.testimonyAudio.src = client.resources[testimony].sfx;
  client.viewport.testimonyAudio.play().catch(() => {});

  const testimonyOverlay = <HTMLImageElement>(
    document.getElementById("client_testimony")
  );
  testimonyOverlay.src = client.resources[testimony].src;
  testimonyOverlay.style.opacity = "1";

  client.viewport.setTestimonyTimer(0);
  client.viewport.setTestimonyUpdater(
    setTimeout(() => client.viewport.updateTestimony(), UPDATE_INTERVAL),
  );
}

import { RTAnimation } from "aolib-ts";
import type * as aolib from "aolib-ts";

/**
 * RT: drive the testimony / judge-ruling state machine. `end_animation`
 * stops any looping testimony overlay instead of showing one.
 */
export function applyTestimonyState(packet: aolib.packets.RTToClient) {
  switch (packet.animation) {
    case RTAnimation.witness_testimony:
      client.testimonyID = 1;
      break;
    case RTAnimation.cross_examination:
      client.testimonyID = 2;
      break;
    case RTAnimation.not_guilty:
      client.testimonyID = 3;
      break;
    case RTAnimation.guilty:
      client.testimonyID = 4;
      break;
    case RTAnimation.end_animation:
      client.viewport.disposeTestimony();
      return;
    default:
      console.warn("Invalid testimony");
  }
  initTestimonyUpdater();
}
