// Standalone dev tool: load an AO character's 3D model (char.ini `[options]
// model = foo.pmx`) and play its per-emote VMD motions. Exercises the same
// MmdController the courtroom uses, so it doubles as a way to verify a
// character's 3D assets and the naming convention in isolation.

import { MmdController } from "./viewport/mmd/mmdController";
import request from "./services/request";
import iniParse from "./iniParse";
import type { Model3dInfo, MmdState } from "./viewport/mmd/types";

interface EmoteEntry {
  desc: string;
  emote: string;
  preanim: string | null;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const hostInput = $<HTMLInputElement>("host");
const charInput = $<HTMLInputElement>("char");
const loadBtn = $<HTMLButtonElement>("load");
const emotesEl = $<HTMLDivElement>("emotes");
const statusEl = $<HTMLDivElement>("status");
const stage = $<HTMLDivElement>("stage");
const vmdInput = $<HTMLInputElement>("vmd");
const playVmdBtn = $<HTMLButtonElement>("playvmd");
const stateButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("#states button"),
);

const setStatus = (msg: string) => {
  statusEl.textContent = msg;
};

const params = new URLSearchParams(location.search);
// Normalize to a trailing slash so `${host}characters/...` is well-formed.
const rawHost = (params.get("asset") ?? "").trim();
const host = rawHost && !rawHost.endsWith("/") ? `${rawHost}/` : rawHost;
hostInput.value = rawHost;
charInput.value = params.get("char") ?? "";

loadBtn.addEventListener("click", () => {
  const p = new URLSearchParams();
  if (hostInput.value) p.set("asset", hostInput.value.trim());
  if (charInput.value) p.set("char", charInput.value.trim());
  location.search = p.toString();
});
charInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadBtn.click();
});

let controller: MmdController | null = null;
let charName = "";
let modelFile = "";
let state: MmdState = "idle";
let current: Model3dInfo | null = null;

for (const btn of stateButtons) {
  btn.addEventListener("click", () => {
    state = btn.dataset.state as MmdState;
    for (const b of stateButtons) b.classList.toggle("active", b === btn);
    if (controller && current) {
      controller.playState(state, current);
      setStatus(`${charName} — ${current.emote} — ${state}`);
    }
  });
}

const renderEmotes = (emotes: EmoteEntry[]): void => {
  emotesEl.innerHTML = "";
  if (emotes.length === 0) {
    emotesEl.innerHTML = '<span class="hint">No emotes in char.ini.</span>';
    return;
  }
  for (const emote of emotes) {
    const btn = document.createElement("button");
    btn.textContent = emote.desc || emote.emote;
    btn.title = `emote: ${emote.emote}${emote.preanim ? ` · preanim: ${emote.preanim}` : ""}`;
    btn.addEventListener("click", () => {
      for (const b of emotesEl.querySelectorAll("button")) b.classList.remove("active");
      btn.classList.add("active");
      void selectEmote(emote);
    });
    emotesEl.appendChild(btn);
  }
};

const selectEmote = async (emote: EmoteEntry): Promise<void> => {
  if (!controller) return;
  setStatus(`Loading ${emote.emote}…`);
  const info = await controller.preload(host, charName, modelFile, emote.emote, emote.preanim);
  if (!info) {
    setStatus("Model failed to load — check the host allows CORS and the .pmx path is correct.");
    return;
  }
  current = info;
  controller.place(stage);
  await controller.show(info);
  controller.playState(state, info);
  const dur = state === "preanim" && info.preanimDurationMs
    ? ` (${Math.round(info.preanimDurationMs)}ms)`
    : "";
  setStatus(`${charName} — ${emote.emote} — ${state}${dur}`);
};

playVmdBtn.addEventListener("click", () => {
  const file = vmdInput.value.trim();
  if (!file || !controller || !charName) return;
  const url = `${host}characters/${encodeURI(charName.toLowerCase())}/${encodeURI(file)}.vmd`;
  setStatus(`Playing ${file}.vmd…`);
  controller.playMotionUrl(url).then(() => setStatus(`Playing ${file}.vmd`));
});

const boot = async (): Promise<void> => {
  charName = (params.get("char") ?? "").trim();
  if (!charName) return;

  setStatus(`Loading char.ini for ${charName}…`);
  let ini: Record<string, any>;
  try {
    ini = iniParse(
      await request(`${host}characters/${encodeURI(charName.toLowerCase())}/char.ini`),
    );
  } catch {
    setStatus(`Could not load char.ini for ${charName} (host: ${host}).`);
    return;
  }

  modelFile = (ini.options?.model ?? "").toString().toLowerCase();
  if (!modelFile) {
    setStatus(`${charName} has no [options] model = key — it is a 2D character.`);
    return;
  }

  const emotes: EmoteEntry[] = [];
  const count = Number(ini.emotions?.number ?? 0);
  for (let i = 1; i <= count; i++) {
    const raw = ini.emotions?.[i];
    if (!raw) continue;
    const [desc, preanim, emote] = raw.split("#");
    emotes.push({
      desc: (desc ?? "").trim(),
      emote: (emote ?? "").toLowerCase(),
      preanim: preanim && preanim !== "-" ? preanim.toLowerCase() : null,
    });
  }
  renderEmotes(emotes);

  controller = new MmdController();
  controller.attachCameraControl();

  const first = emotes[0] ?? { desc: "normal", emote: "normal", preanim: null };

  // ?bind=1 shows the raw model with no motion applied (bind pose), for
  // diagnosing whether a pose problem comes from the model or the VMD.
  if (params.get("bind") === "1") {
    const info = await controller.preload(host, charName, modelFile, first.emote, first.preanim);
    if (info) {
      controller.place(stage);
      await controller.show(info);
      setStatus(`${charName} — bind pose (no motion)`);
    }
    return;
  }

  await selectEmote(first);
};

void boot();
