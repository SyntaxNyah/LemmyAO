import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser, Page } from "puppeteer";
import { launch, openClient, settle, spectate, startServer, type Server } from "./harness";

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

const group = (tabs: string[], size = 1) => ({ kind: "group", tabs, active: tabs[0], size });
const OTHERS = ["log", "ooc", "areas", "music", "players"];

/** The viewport and IC options on the left, `right` stacked on the right. */
const layout = (...right: object[]) =>
  JSON.stringify({
    root: {
      kind: "split",
      dir: "row",
      size: 1,
      children: [
        { kind: "split", dir: "column", size: 2, children: [group(["viewport"], 2.4), group(["emotes"])] },
        { kind: "split", dir: "column", size: 1, children: right },
      ],
    },
  });

async function withLayout(panelLayout: string): Promise<Page> {
  const page = await openClient(browser, server, { storage: { panelLayout } });
  await spectate(page);
  return page;
}

/** How many sample points of the open list something else is drawn over. */
const coveredPoints = (page: Page) =>
  page.evaluate(() => {
    const list = document.querySelector('[role="listbox"].list')!;
    const r = list.getBoundingClientRect();
    let covered = 0;
    for (let x = r.left + 4; x < r.right - 4; x += 12)
      for (let y = r.top + 4; y < r.bottom - 4; y += 12) if (!list.contains(document.elementFromPoint(x, y))) covered++;
    return covered;
  });

describe("search dropdowns", () => {
  test("the backgrounds list draws over the panel below it", async () => {
    const page = await withLayout(layout(group(["background"], 1), group(["evidence", ...OTHERS, "settings"], 4)));
    await page.focus('.panel[aria-label="Background"] input[role="combobox"]');
    await settle(200);
    const below = await page.$eval('.panel[aria-label="Evidence"]', (e) => e.getBoundingClientRect().top);
    const list = await page.$eval('[role="listbox"].list', (e) => e.getBoundingClientRect().bottom);
    expect(list).toBeGreaterThan(below);
    expect(await coveredPoints(page)).toBe(0);
  });

  test("the evidence image list opens upward over the panel above, and picking shows the image", async () => {
    const page = await withLayout(layout(group(["settings", ...OTHERS, "background"]), group(["evidence"])));
    await page.evaluate(() =>
      ([...document.querySelectorAll('.panel[aria-label="Evidence"] button')].find((b) => b.textContent?.trim() === "Add evidence") as HTMLElement).click(),
    );
    const input = '.panel[aria-label="Evidence"] input[role="combobox"]';
    await page.waitForSelector(input);
    await page.focus(input);
    await settle(200);
    const field = await page.$eval(input, (e) => e.getBoundingClientRect().top);
    const list = await page.$eval('[role="listbox"].list', (e) => e.getBoundingClientRect().bottom);
    expect(list).toBeLessThanOrEqual(field);
    expect(await coveredPoints(page)).toBe(0);

    await page.type(input, "test");
    await settle(150);
    await page.evaluate(() =>
      ([...document.querySelectorAll('[role="listbox"].list [role="option"]')].find((o) => o.textContent?.includes("test.png")) as HTMLElement).click(),
    );
    await page.waitForFunction(() => {
      const img = document.querySelector('.panel[aria-label="Evidence"] .thumb.large img') as HTMLImageElement | null;
      return !!img?.complete && img.naturalWidth > 0;
    });
    expect(await page.$eval(input, (e) => (e as HTMLInputElement).value)).toBe("test.png");
    expect(await page.$('[role="listbox"].list')).toBeNull();
  });
});
