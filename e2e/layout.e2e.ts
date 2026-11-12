import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser, Page } from "puppeteer";
import {
  clientUrl,
  dragTab,
  launch,
  layoutTree,
  openClient,
  panelsOnSlots,
  rect,
  setEditMode,
  settle,
  spectate,
  startServer,
  type Server,
} from "./harness";

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

const SIDE = ["log", "ooc", "areas", "music", "players", "background", "evidence", "settings"];
const without = (...tabs: string[]) => SIDE.filter((t) => !tabs.includes(t));
const LEFT = { column: [["viewport"], ["emotes"]] };
const slot = (key: string) => `.slot[data-drop-slot="${key}"]`;

async function editing(): Promise<Page> {
  const page = await openClient(browser, server);
  await spectate(page);
  await setEditMode(page, true);
  return page;
}

describe("landscape layout", () => {
  test("by default the viewport is above IC options, the other tabs share one panel, and lone tabs have no tab bar", async () => {
    const page = await openClient(browser, server);
    await spectate(page);
    const viewport = await rect(page, '.panel[aria-label="Viewport"]');
    const options = await rect(page, '.panel[aria-label="IC Options"]');
    const chatlog = await rect(page, '.panel[aria-label="Chatlog"]');
    expect(options.top).toBeGreaterThanOrEqual(viewport.bottom - 1);
    expect(chatlog.left).toBeGreaterThanOrEqual(viewport.right - 1);
    expect(await page.$$eval(".tabs-wrap", (w) => w.length)).toBe(1);
    expect(await page.$('.panel[aria-label="Viewport"] #client_inputbox')).not.toBeNull();
    expect(await panelsOnSlots(page)).toBe(true);
  });

  test("turning on edit mode moves nothing; lone tabs get a floating handle", async () => {
    const page = await openClient(browser, server);
    await spectate(page);
    await page.click('[data-tab="settings"]');
    await settle(150);
    const slots = () => page.$$eval(".slot", (s) => s.map((e) => JSON.stringify(e.getBoundingClientRect())));
    const before = await slots();
    await setEditMode(page, true);
    expect(await slots()).toEqual(before);
    expect(await page.$$eval(".tabs-wrap.floating", (w) => w.length)).toBe(2);
  });

  test("a tab dropped beside a stacked panel splits only that panel", async () => {
    const page = await editing();
    const side = await rect(page, slot("g.1"));
    await dragTab(page, "background", side.left + side.width / 2, side.bottom - 20);
    expect(await layoutTree(page)).toEqual({ row: [LEFT, { column: [without("background"), ["background"]] }] });
    const top = await rect(page, slot("g.1.0"));
    await dragTab(page, "music", top.right - 20, top.top + top.height / 2);
    expect(await layoutTree(page)).toEqual({
      row: [LEFT, { column: [{ row: [without("background", "music"), ["music"]] }, ["background"]] }],
    });
    expect(await panelsOnSlots(page)).toBe(true);
  });

  test("a tab dropped on a panel's top edge goes above it", async () => {
    const page = await editing();
    const viewport = await rect(page, slot("g.0.0"));
    await dragTab(page, "ooc", viewport.left + viewport.width / 2, viewport.top + 24);
    expect(await layoutTree(page)).toEqual({ row: [{ column: [["ooc"], ["viewport"], ["emotes"]] }, without("ooc")] });
  });

  test("a tab dropped on the screen's left edge gets a full-height panel there", async () => {
    const page = await editing();
    await dragTab(page, "areas", 4, 400);
    expect(await layoutTree(page)).toEqual({ row: [["areas"], LEFT, without("areas")] });
    const areas = await rect(page, '.panel[aria-label="Areas"]');
    const viewport = await rect(page, '.panel[aria-label="Viewport"]');
    expect(areas.left).toBeLessThan(1);
    expect(viewport.left).toBeGreaterThanOrEqual(areas.right - 1);
  });

  test("the viewport moves like any tab, keeping the message being typed", async () => {
    const page = await editing();
    await page.type("#client_inputbox", "half a sentence");
    await page.$eval('[data-drop-strip="g.1"]', (e) => (e.scrollLeft = 0));
    const strip = await rect(page, '[data-drop-strip="g.1"]');
    await dragTab(page, "viewport", strip.left + 6, strip.top + strip.height / 2);
    expect(await layoutTree(page)).toEqual({ row: [["emotes"], ["viewport", ...SIDE]] });
    expect(await page.$eval("#client_inputbox", (e) => (e as HTMLInputElement).value)).toBe("half a sentence");
    expect(await panelsOnSlots(page)).toBe(true);
  });

  test("a split knob resizes the panels beside it, and only the knob shows the resize cursor", async () => {
    const page = await editing();
    const knob = await rect(page, ".split-knob.sideways");
    const cursor = (x: number, y: number) => page.evaluate((px, py) => getComputedStyle(document.elementFromPoint(px, py)!).cursor, x, y);
    const cx = knob.left + knob.width / 2;
    const cy = knob.top + knob.height / 2;
    expect(await cursor(cx, cy)).toBe("col-resize");
    expect(await cursor(cx, cy > 300 ? 120 : cy + 250)).not.toBe("col-resize");
    const before = await rect(page, slot("g.0.0"));
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 100, cy, { steps: 5 });
    await page.mouse.up();
    await settle(200);
    const after = await rect(page, slot("g.0.0"));
    expect(after.width).toBeWithin(before.width - 110, before.width - 90);
  });

  test("the layout survives a reload, and Reset layout restores the default", async () => {
    const page = await editing();
    const side = await rect(page, slot("g.1"));
    await dragTab(page, "evidence", side.left + side.width / 2, side.bottom - 20);
    const saved = await layoutTree(page);
    await page.goto(clientUrl(server), { waitUntil: "load" });
    await spectate(page);
    expect(await layoutTree(page)).toEqual(saved);
    expect(await page.$('.slot[data-drop-slot="g.1.1"]')).not.toBeNull();
    await page.click('[data-tab="settings"]');
    await page.evaluate(() => ([...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Reset layout") as HTMLElement).click());
    await settle(200);
    expect(await layoutTree(page)).toBeNull();
    expect(await page.$$eval(".tabs-wrap", (w) => w.length)).toBe(1);
  });

  test("the viewport fits its panel at 4:3, or 16:9 when that's set", async () => {
    const page = await openClient(browser, server);
    await spectate(page);
    const ratio = async () => {
      const f = await rect(page, ".viewport-frame");
      return f.width / f.height;
    };
    expect(await ratio()).toBeCloseTo(4 / 3, 1);
    await page.click('[data-tab="settings"]');
    await page.evaluate(() =>
      ([...document.querySelectorAll("label.check")].find((l) => l.textContent?.trim() === "16:9 viewport")!.querySelector("input") as HTMLInputElement).click(),
    );
    await settle(200);
    expect(await ratio()).toBeCloseTo(16 / 9, 1);
  });
});
