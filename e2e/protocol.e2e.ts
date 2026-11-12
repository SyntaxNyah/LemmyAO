import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser, Page } from "puppeteer";
import { joinAs, launch, openClient, settle, spectate, startServer, wires, type Server } from "./harness";

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

// KFO-Server's 2.8 MS validation (net_cmd_ms): exactly 26 fields; only preanim, emote,
// message and showname may be empty; the INT fields must be integers.
const KFO_INTS = [7, 8, 9, 11, 12, 13, 14, 18, 20, 24];
function kfoRejects(args: string[]) {
  const problems: string[] = [];
  if (args.length !== 26) problems.push(`${args.length} fields`);
  args.forEach((a, i) => {
    if (a === "" && ![1, 3, 4, 15].includes(i)) problems.push(`field ${i} empty`);
    if (KFO_INTS.includes(i) && !/^-?\d+$/.test(a)) problems.push(`field ${i} not an integer: ${a}`);
  });
  return problems;
}

const icLog = (page: Page) => page.$$eval('[aria-label="In-character log"] .entry', (es) => es.map((e) => e.textContent?.replace(/\s+/g, " ").trim()));
const oocLog = (page: Page) => page.$$eval('[aria-label="Out-of-character chat"] .entry', (es) => es.map((e) => e.textContent?.replace(/\s+/g, " ").trim()));
const clickButton = (page: Page, scope: string, text: string) =>
  page.evaluate(
    (s, t) => ([...document.querySelectorAll(`${s} button`)].find((b) => b.textContent?.trim().includes(t)) as HTMLElement).click(),
    scope,
    text,
  );

describe("protocol", () => {
  test("an IC message goes out in a form KFO-Server accepts and comes back into the log", async () => {
    const page = await openClient(browser, server);
    await joinAs(page, "Phoenix");
    await page.type("#client_inputbox", "plain message");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector('[aria-label="In-character log"]')?.textContent?.includes("plain message"));
    const sent = wires(page).find((w) => w.startsWith("C: MS#"))!;
    const args = sent.slice("C: MS#".length, -"#%".length).split("#");
    expect(kfoRejects(args)).toEqual([]);
    expect(args[25]).toBe("||");
    expect(await page.$eval("#client_inputbox", (e) => (e as HTMLInputElement).value)).toBe("");
  });

  test("other players see an IC message", async () => {
    const speaker = await openClient(browser, server);
    const listener = await openClient(browser, server);
    await joinAs(speaker, "Edgeworth");
    await spectate(listener);
    await speaker.type("#client_inputbox", "objection overruled");
    await speaker.keyboard.press("Enter");
    await listener.waitForFunction(() => document.querySelector('[aria-label="In-character log"]')?.textContent?.includes("objection overruled"));
    expect((await icLog(listener)).some((e) => e?.includes("Edgeworth") && e.includes("objection overruled"))).toBe(true);
  });

  test("OOC chat goes out and comes back", async () => {
    const page = await openClient(browser, server);
    await spectate(page);
    await page.click('[data-tab="ooc"]');
    await page.type('[aria-label="OOC message"]', "hello out of character");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector('[aria-label="Out-of-character chat"]')?.textContent?.includes("hello out of character"));
    expect(wires(page).some((w) => w.startsWith("C: CT#") && w.includes("hello out of character"))).toBe(true);
  });

  test("OOC goes out under the showname, else the character's name; there's no separate OOC name", async () => {
    const page = await openClient(browser, server);
    await joinAs(page, "Phoenix");
    await page.click('[data-tab="ooc"]');
    expect(await page.$('[aria-label="OOC name"]')).toBeNull();
    const oocNames = () => wires(page).filter((w) => w.startsWith("C: CT#")).map((w) => w.split("#")[1]);
    const say = async (text: string) => {
      await page.type('[aria-label="OOC message"]', text);
      await page.keyboard.press("Enter");
      await page.waitForFunction((t) => document.querySelector('[aria-label="Out-of-character chat"]')?.textContent?.includes(t), {}, text);
    };
    await say("no showname yet");
    await page.type('input[placeholder="Pick a name…"]', "Nick");
    await page.keyboard.press("Enter");
    await say("with a showname");
    expect(oocNames()).toEqual(["Phoenix", "Nick"]);
  });

  test("moving to an area, and a locked area refusing", async () => {
    const page = await openClient(browser, server);
    await joinAs(page, "Phoenix");
    await page.click('[data-tab="areas"]');
    await clickButton(page, ".areas", "Courtroom");
    await page.waitForFunction(() => document.querySelector('[aria-label="In-character log"]')?.textContent?.includes("Courtroom"));
    await clickButton(page, ".areas", "Lobby");
    await page.waitForFunction(() => document.querySelector('[aria-label="Out-of-character chat"]')?.textContent?.includes("The Lobby is locked."));
    expect((await oocLog(page)).some((e) => e?.includes("The Lobby is locked."))).toBe(true);
  });

  test("playing a track shows it as now playing", async () => {
    const page = await openClient(browser, server);
    await spectate(page);
    await page.click('[data-tab="music"]');
    await clickButton(page, ".music", "Trial");
    await page.waitForFunction(() => document.querySelector(".music .now-title")?.textContent?.includes("Trial"));
  });

  test("adding evidence shows it to everyone", async () => {
    const page = await openClient(browser, server);
    const other = await openClient(browser, server);
    await spectate(page);
    await spectate(other);
    await page.click('[data-tab="evidence"]');
    await clickButton(page, ".evidence", "Add evidence");
    const name = `Badge ${Date.now()}`;
    await page.type('.evidence .editor input[required]', name);
    await page.type('.evidence input[role="combobox"]', "test.png");
    await page.type(".evidence textarea", "Found at the scene.");
    await clickButton(page, ".evidence .editor", "Add");
    await other.waitForFunction((n) => document.querySelector('[aria-label="Evidence"] .grid')?.textContent?.includes(n), {}, name);
    await settle(100);
    expect(wires(page).some((w) => w.startsWith("C: PE#") && w.includes("test.png"))).toBe(true);
  });
});
