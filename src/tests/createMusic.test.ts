import { beforeEach, describe, expect, test } from "bun:test";
import { reloadSettings, setSetting } from "../core/settings";
import { createMusic } from "../viewport/utils/createMusic";

beforeEach(() => {
  localStorage.clear();
  reloadSettings();
  document.body.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const el = document.createElement("audio");
    el.className = "audioChannel";
    document.body.append(el);
  }
});

describe("createMusic", () => {
  test("new music channels start at the saved volume", () => {
    setSetting("musicVolume", 0.25);
    setSetting("musicMuted", true);

    for (const channel of Object.values(createMusic())) {
      expect(channel.volume).toBe(0.25);
      expect(channel.muted).toBe(true);
    }
  });
});
