import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser } from "puppeteer";
import { launch, openClient, spectate, settle, startServer, type Server } from "./harness";

let server: Server;
let browser: Browser;

beforeAll(async () => {
  server = await startServer();
  browser = await launch();
});

afterAll(async () => {
  await browser?.close();
  server?.stop();
});

describe("audio settings", () => {
  test("the music slider alone updates the music channels", async () => {
    const page = await openClient(browser, server);
    await spectate(page);
    await page.click('[data-tab="settings"]');
    await settle(150);

    const volumes = await page.evaluate(() => {
      const rows = [...document.querySelectorAll<HTMLElement>(".settings .volume")];
      const music = rows.find((row) => row.textContent?.includes("Music"))!;
      const slider = music.querySelector<HTMLInputElement>('input[type="range"]')!;
      slider.value = "0.25";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      return [...document.querySelectorAll<HTMLAudioElement>("audio.audioChannel")].map((a) => a.volume);
    });

    expect(volumes).toEqual([0.25, 0.25, 0.25, 0.25]);
    await page.close();
  }, 30000);
});
