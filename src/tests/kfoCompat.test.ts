import { describe, expect, test } from "bun:test";
import * as aolib from "aolib-ts";
import { repairInbound } from "../core/connection";

// KFO-Server's 2.8 MS validation (server/network/aoprotocol.py, net_cmd_ms): exactly
// these 26 fields, STR non-empty, INT an integer. Anything else is dropped.
const KFO_28 = "STR STR? STR STR? STR? STR STR INT INT INT INT|STR INT INT INT INT STR? STR STR INT STR INT STR STR STR INT STR".split(" ");

function kfoAccepts(wire: string) {
  const args = wire.replace(/^MS#/, "").replace(/#%$/, "").split("#");
  if (args.length !== KFO_28.length) return false;
  return args.every((arg, i) => {
    const type = KFO_28[i];
    if (arg === "" && type !== "STR?") return false;
    if (type === "INT") return /^-?\d+$/.test(arg);
    return true;
  });
}

function sent(effect: { name: string; folder: string; sound: string }) {
  let wire = "";
  const server = aolib.server({ send: (w) => (wire = w) });
  server.send.MS({
    preanim: "-",
    character: "Phoenix",
    emote: "normal",
    message: "hi",
    side: aolib.Side.def,
    sfx_name: "0",
    char_id: 3,
    frames_shake: "-",
    frames_realization: "-",
    frames_sfx: "-",
    effect,
  });
  return wire;
}

describe("KFO-Server compatibility", () => {
  test("an IC message without an effect passes KFO's validation", () => {
    const wire = sent({ name: "", folder: "", sound: "" });
    expect(wire).toEndWith("#||#%");
    expect(kfoAccepts(wire)).toBe(true);
  });

  test("an effect is sent as it is", () => {
    const wire = sent({ name: "rain", folder: "effects", sound: "" });
    expect(wire).toEndWith("#rain|effects|#%");
    expect(kfoAccepts(wire)).toBe(true);
  });

  test("an ID without a version, an SI with blank counts and a PV with a blank player ID still decode", () => {
    const got: string[] = [];
    const server = aolib.server({ send: () => {}, onDecodeError: (h) => got.push(`error ${h}`) });
    server.on.ID((p) => got.push(`ID ${p.software} '${p.version}'`));
    server.on.SI((p) => got.push(`SI ${p.char_count} ${p.evi_count} ${p.mus_count}`));
    server.on.PV((p) => got.push(`PV ${p.char_id}`));
    server.receive(repairInbound("ID#0#CSDWASASH#%"));
    server.receive(repairInbound("SI#110###%"));
    server.receive(repairInbound("PV###7#%"));
    expect(got).toEqual(["ID CSDWASASH ''", "SI 110 0 0", "PV 7"]);
    expect(repairInbound("ID#0#KFO-Server#3.3.0#%")).toBe("ID#0#KFO-Server#3.3.0#%");
  });
});
