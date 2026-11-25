import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser, Page } from "puppeteer";
import { joinAs, launch, openClient, startServer, type Server } from "./harness";

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



const chooseSide = (page: Page, side: string) =>
  page.evaluate((value) => {
    const field = [...document.querySelectorAll(".field")].find(
      (element) => element.querySelector(".field-label")?.textContent?.trim() === "Side",
    );
    const select = field?.querySelector("select");
    if (!select) throw new Error("Side select not found");
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, side);

const penaltyToggle = (page: Page, on: boolean) =>
  page.evaluate((want) => {
    const label = [...document.querySelectorAll("label.check")].find(
      (element) => element.textContent?.trim() === "Penalty bars",
    );
    const input = label?.querySelector("input");
    if (!input) throw new Error("Penalty bars setting not found");
    if (input.checked !== want) input.click();
  }, on);

describe("penalty bars", () => {
  test("stay off the stage until enabled, while judge controls remain", async () => {
    const page = await openClient(browser, server);
    await joinAs(page, "Phoenix");
    await page.waitForFunction(() => !document.querySelector(".sheet"));
    await page.waitForSelector(".emotes .tile");
    await chooseSide(page, "jud");
    await page.waitForSelector('[aria-label="Lower defense health"]');
    expect(await page.$(".penalty-bars")).toBeNull();

    await page.evaluate(() => (document.querySelector('[data-tab="settings"]') as HTMLElement).click());
    await page.waitForSelector('[aria-label="Search settings"]');
    await penaltyToggle(page, true);
    await page.waitForSelector(".penalty-bars");
    const labels = await page.$$eval(".penalty-bars .label", (els) => els.map((el) => el.textContent?.trim()));
    expect(labels).toEqual(["Defense", "Prosecution"]);
    expect(await page.$$eval(".penalty-bars .defense .pip.filled", (els) => els.length)).toBe(10);
    expect(await page.$$eval(".penalty-bars .prosecution .pip.filled", (els) => els.length)).toBe(10);

    await penaltyToggle(page, false);
    await page.waitForFunction(() => !document.querySelector(".penalty-bars"));
    expect(await page.$('[aria-label="Lower defense health"]')).not.toBeNull();
  });
});