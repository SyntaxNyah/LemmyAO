import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser, Page } from "puppeteer";
import { launch, openClient, panelsOnSlots, rect, settle, spectate, startServer, type Server } from "./harness";

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

const phone = (width: number, height: number) => ({ width, height, isMobile: true, hasTouch: true });

async function onPhone(): Promise<Page> {
  const page = await openClient(browser, server, { viewport: phone(390, 844) });
  await spectate(page);
  return page;
}

const layoutOf = (page: Page) => page.$eval(".shell", (s) => (s.classList.contains("landscape") ? "landscape" : "portrait"));
const selectedTab = (page: Page) => page.$eval('[role="tab"][aria-selected="true"]', (t) => t.getAttribute("data-tab"));
const focused = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName);

describe("phone", () => {
  test("portrait keeps the viewport and message bar on top, and every other tab in one strip", async () => {
    const page = await onPhone();
    expect(await layoutOf(page)).toBe("portrait");
    const viewport = await rect(page, '.panel[aria-label="Viewport"]');
    expect(viewport.top).toBeLessThan(1);
    expect(await page.$('.panel[aria-label="Viewport"] #client_inputbox')).not.toBeNull();
    const tabs = await page.$$eval('[role="tab"][data-tab]', (t) => t.map((e) => e.getAttribute("data-tab")));
    expect(tabs).not.toContain("viewport");
    expect(tabs).toHaveLength(9);
    expect(await panelsOnSlots(page)).toBe(true);
  });

  test("the on-screen keyboard doesn't flip the layout or move focus", async () => {
    const page = await onPhone();
    await page.click('[data-tab="ooc"]');
    await page.focus('[aria-label="OOC message"]');
    // Chrome on Android shrinks the page's height for the keyboard (interactive-widget=resizes-content).
    await page.setViewport(phone(390, 330));
    await settle(300);
    expect([await layoutOf(page), await selectedTab(page), await focused(page)]).toEqual(["portrait", "ooc", "OOC message"]);
    await page.setViewport(phone(390, 844));
    await settle(300);
    expect([await layoutOf(page), await selectedTab(page), await focused(page)]).toEqual(["portrait", "ooc", "OOC message"]);
  });

  test("rotating switches between the portrait and landscape layouts", async () => {
    const page = await onPhone();
    await page.setViewport(phone(844, 390));
    await settle(300);
    expect(await layoutOf(page)).toBe("landscape");
    await page.setViewport(phone(390, 844));
    await settle(300);
    expect(await layoutOf(page)).toBe("portrait");
  });

  test("text fields are at least 16px on touch screens, so iOS doesn't zoom into them", async () => {
    const small = (page: Page) =>
      page.$$eval("input, select, textarea", (fields) =>
        fields
          .filter((f) => !["checkbox", "radio", "range", "color", "hidden", "file"].includes((f as HTMLInputElement).type))
          .filter((f) => parseFloat(getComputedStyle(f).fontSize) < 16)
          .map((f) => f.getAttribute("aria-label") ?? f.getAttribute("placeholder") ?? f.tagName),
      );
    expect(await small(await onPhone())).toEqual([]);
    const desktop = await openClient(browser, server);
    await spectate(desktop);
    expect((await small(desktop)).length).toBeGreaterThan(0);
  });
});
