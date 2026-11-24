import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser, Page } from "puppeteer";
import { joinAs, launch, openClient, spectate, startServer, wires, type Server } from "./harness";

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

const openBackgroundTab = async (page: Page) => {
  await page.$eval('[data-tab="background"]', (tab) => tab.scrollIntoView({ block: "nearest", inline: "center" }));
  await page.click('[data-tab="background"]');
};

const openPicker = async (page: Page) => {
  await openBackgroundTab(page);
  await page.click('[aria-label="Browse backgrounds"]');
  await page.waitForSelector('[aria-label="Choose a background"]');
  await page.waitForSelector('[data-background="Anime"]');
};

const tileNames = (page: Page) =>
  page.$$eval(".tile .name", (names) => names.map((name) => name.textContent?.trim() ?? ""));

describe("background picker", () => {
  test("browses, searches, pins favorites, previews and randomizes", async () => {
    const page = await openClient(browser, server);
    await spectate(page);
    await openPicker(page);

    // The demo server starts on gs4; the current background leads the grid.
    expect(await page.$eval(".tile.current .name", (name) => name.textContent?.trim())).toBe("gs4");
    expect(await tileNames(page)).toContain("Anime");

    await page.type('[aria-label="Search backgrounds"]', "anime");
    await page.waitForFunction(() => {
      const names = [...document.querySelectorAll(".tile .name")];
      return names.length > 0 && names.every((name) => name.textContent?.toLowerCase().includes("anime"));
    });

    await page.$eval('[aria-label="Search backgrounds"]', (input) => {
      const field = input as HTMLInputElement;
      field.value = "";
      field.dispatchEvent(new Event("input"));
    });
    await page.waitForSelector('[data-background="Anime"]');
    await page.click('[data-background="Anime"] .star');
    expect(await page.$eval('[data-background="Anime"] .star', (star) => star.getAttribute("aria-pressed"))).toBe("true");

    // Reopening keeps the current first and pins the favorite next.
    await page.click('[aria-label="Choose a background"] [aria-label="Close"]');
    await openPicker(page);
    expect((await tileNames(page)).slice(0, 2)).toEqual(["gs4", "Anime"]);

    await page.evaluate(() => {
      const tile = document.querySelector('[data-background="gs4"]')!;
      tile.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });
    await page.waitForSelector('[aria-label="Background preview"]');
    expect(await page.$eval('[aria-label="Background preview"]', (card) => card.textContent)).toContain("gs4");
    await page.click('[aria-label="Close preview"]');

    await page.click('[aria-label="Random background"]');
    await page.waitForFunction(() => !document.querySelector('[aria-label="Choose a background"]'));
    expect(wires(page).some((wire) => wire.startsWith("C: CT#") && wire.includes("/bg "))).toBe(true);
  });

  test("positions follow the current side and cycle in the preview", async () => {
    const page = await openClient(browser, server);
    await joinAs(page, "Phoenix");
    await openBackgroundTab(page);
    await page.waitForSelector('[data-position="def"]');

    const labels = await page.$$eval(".position-label", (els) => els.map((el) => el.textContent?.trim()));
    expect(labels).toEqual(["Defense", "Prosecution", "Defense helper", "Prosecution helper", "Witness", "Judge"]);
    expect(await page.$eval('[data-position="def"]', (el) => el.getAttribute("aria-pressed"))).toBe("true");

    await page.click('[data-position="wit"]');
    expect(await page.$eval('[data-position="wit"]', (el) => el.getAttribute("aria-pressed"))).toBe("true");
    expect(wires(page).some((wire) => wire.startsWith("C: CT#") && wire.includes("/pos wit"))).toBe(true);
    await page.waitForFunction(() => document.querySelector(".current .preview img")?.getAttribute("src")?.includes("witnessempty"));

    await page.click('[aria-label="Hide position previews"]');
    await page.waitForFunction(() => !document.querySelector(".position-strip"));
    expect(await page.$eval('[aria-label="Show position previews"]', (el) => el.getAttribute("aria-expanded"))).toBe("false");
    await page.click('[aria-label="Show position previews"]');
    await page.waitForSelector(".position-strip");

    await openPicker(page);
    await page.evaluate(() => {
      const tile = document.querySelector('[data-background="gs4"]')!;
      tile.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });
    await page.waitForSelector('[aria-label="Background preview"]');
    await page.waitForSelector('[aria-label="Background preview"] input[type="checkbox"]');
    const caption = () =>
      page.$eval('[aria-label="Background preview"] figcaption', (el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "");
    expect(await caption()).toContain("/ 6");
    expect(await page.$eval('[aria-label="Background preview"] input[type="checkbox"]', (el) => (el as HTMLInputElement).checked)).toBe(false);

    const before = await caption();
    await page.click('[aria-label="Next position"]');
    await page.waitForFunction(
      (old) => {
        const el = document.querySelector('[aria-label="Background preview"] figcaption');
        return (el?.textContent?.replace(/\s+/g, " ").trim() ?? "") !== old;
      },
      {},
      before,
    );
    expect(await caption()).not.toBe(before);

    const beforeCycle = await caption();
    await page.click('[aria-label="Background preview"] input[type="checkbox"]');
    await page.waitForFunction(
      (old) => {
        const el = document.querySelector('[aria-label="Background preview"] figcaption');
        return (el?.textContent?.replace(/\s+/g, " ").trim() ?? "") !== old;
      },
      {},
      beforeCycle,
    );
    expect(await caption()).not.toBe(beforeCycle);
    await page.click('[aria-label="Background preview"] input[type="checkbox"]');
    await page.click('[aria-label="Close preview"]');
  });});