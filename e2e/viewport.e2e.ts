import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser } from "puppeteer";
import {
  BLIP_MS,
  joinAs,
  launch,
  openClient,
  PREANIM_FRAMES,
  recording,
  say,
  SFX_DELAY_TICKS,
  SFX_MS,
  SHOUT_MS,
  SHOUT_SOUND_MS,
  shownText,
  startServer,
  type Recording,
  type Server,
} from "./harness";

// Headless timers are only as exact as the machine; real errors are hundreds of ms.
const TOLERANCE_MS = 60;
const SYNC_TOLERANCE_MS = 20;
const PREANIM_MS = PREANIM_FRAMES.reduce((a, b) => a + b, 0);
const PREANIM_MARGIN_MS = 20;
const TEXT_SPEED_MS = 60;

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

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const first = (rec: Recording, what: string) => rec.visuals.find(([, w]) => w === what)?.[0];
const lettersAt = (rec: Recording) => rec.visuals.filter(([, w]) => w.startsWith("text ")).map(([t]) => t);

/** Plays "Hi there" with an objection and the 600 ms "slam" preanim, and checks the whole timeline. */
async function checkSequence(latencyS?: number) {
  const page = await openClient(browser, server, { latencyS });
  await joinAs(page, "Phoenix");
  const text = "Hi there";
  await say(page, text, { emote: 1, shout: "objection" });
  await settle(SHOUT_MS + PREANIM_MS + text.length * TEXT_SPEED_MS + 1500);
  const rec = await recording(page);

  const shout = first(rec, "shout block")!;
  const preanim = first(rec, "sprite slam.apng")!;
  const talking = first(rec, "sprite (b)normal.png")!;
  const letters = lettersAt(rec);
  const idle = rec.visuals.findLast(([, w]) => w === "sprite (a)normal.png")![0];
  expect(shout).toBeDefined();

  // Shout, preanim, talking, letters, idle: in order and on time.
  expect(preanim - shout).toBeWithin(SHOUT_MS - TOLERANCE_MS, SHOUT_MS + TOLERANCE_MS);
  expect(talking - preanim).toBeWithin(PREANIM_MS - PREANIM_MARGIN_MS - TOLERANCE_MS, PREANIM_MS - PREANIM_MARGIN_MS + TOLERANCE_MS);
  expect(talking - preanim).toBeLessThan(PREANIM_MS);
  expect(letters).toHaveLength(text.length);
  expect(letters[0]).toBeGreaterThan(talking);
  expect(idle).toBeGreaterThanOrEqual(letters.at(-1)! - 1);
  for (let i = 1; i < letters.length; i++) expect(letters[i]).toBeGreaterThanOrEqual(letters[i - 1]);

  // Sounds are scheduled one output latency ahead of what they belong to.
  const shoutSound = rec.sounds.find((s) => s.ms === SHOUT_SOUND_MS)!;
  const offset = shout - shoutSound.at;
  expect(offset).toBeWithin((latencyS ?? 0) * 1000 - SYNC_TOLERANCE_MS, (latencyS ?? 0) * 1000 + 50 + SYNC_TOLERANCE_MS);

  const blips = rec.sounds.filter((s) => s.ms === BLIP_MS);
  const voiced = letters.filter((_, i) => text[i] !== " ");
  expect(blips).toHaveLength(voiced.length);
  blips.forEach((blip, i) => expect(voiced[i] - blip.at).toBeWithin(offset - SYNC_TOLERANCE_MS, offset + SYNC_TOLERANCE_MS));

  // The emote's sound waits for the shout plus its delay.
  const sfx = rec.sounds.find((s) => s.ms === SFX_MS)!;
  expect(sfx.at - shoutSound.at).toBeWithin(SHOUT_MS + SFX_DELAY_TICKS * 40 - TOLERANCE_MS, SHOUT_MS + SFX_DELAY_TICKS * 40 + TOLERANCE_MS);
  await page.close();
}

describe("IC message playback", () => {
  test("shout, preanim, talking and idle play in order, with each blip on its letter", () => checkSequence(), 30000);

  test("on a high-latency (Bluetooth) output, visuals wait so blips still land on their letters", () => checkSequence(0.25), 30000);

  test("an interrupting message cancels the blips the first one still had due", async () => {
    const page = await openClient(browser, server);
    await joinAs(page, "Phoenix");
    await say(page, "a".repeat(40));
    await page.waitForFunction(() => (document.getElementById("client_inner_chat")?.textContent?.length ?? 0) >= 5);
    await say(page, "zz");
    await settle(2000);
    const rec = await recording(page);

    expect(await shownText(page)).toBe("zz");
    const firstBlips = rec.sounds.filter((s) => s.ms === BLIP_MS).slice(0, 40);
    const cancelledAt = Math.min(...firstBlips.map((s) => s.stoppedAt ?? Infinity));
    expect(cancelledAt).toBeLessThan(Infinity);
    // Nothing of the first message is left to play after the second took over.
    expect(firstBlips.filter((s) => s.at > cancelledAt && s.stoppedAt === null)).toHaveLength(0);
    await page.close();
  }, 30000);

  test("messages play in the order they were sent, even when an earlier one loads slower", async () => {
    const page = await openClient(browser, server, { delays: { "/characters/edgeworth/slam.apng": 800 } });
    await joinAs(page, "Edgeworth");
    await say(page, "first", { emote: 1 });
    await settle(100);
    await say(page, "second");
    await settle(3000);
    const rec = await recording(page);

    const slowPreanim = first(rec, "sprite slam.apng");
    const secondTalks = rec.visuals.findLast(([, w]) => w === "sprite (b)normal.png")![0];
    expect(slowPreanim).toBeDefined();
    expect(slowPreanim!).toBeLessThan(secondTalks);
    expect(await shownText(page)).toBe("second");
    await page.close();
  }, 30000);
});
