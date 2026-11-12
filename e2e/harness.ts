import { spawn, type Subprocess } from "bun";
import puppeteer, { type Browser, type Page, type Viewport } from "puppeteer";
import { apng, png, wav } from "./assets";

/** Known lengths the tests assert against. */
export const PREANIM_FRAMES = [150, 150, 150, 150];
export const SHOUT_MS = 720; // objection, from getResources
export const SFX_DELAY_TICKS = 5;
export const BLIP_MS = 40;
export const SHOUT_SOUND_MS = 300;
export const SFX_MS = 150;

const charIni = (name: string, chat = "") => `[Options]
name = ${name}
showname = ${name}
side = def
blips = male
${chat ? `chat = ${chat}` : ""}

[Emotions]
number = 2
1 = Normal#-#normal#0#1
2 = Slam#slam#normal#1#1

[SoundN]
2 = sfx-test

[SoundT]
2 = ${SFX_DELAY_TICKS}
`;

const ASSETS: Record<string, Buffer | string> = {
  "/sounds/blips/male.opus": wav(BLIP_MS),
  "/misc/default/objection_bubble.png": png([255, 0, 0]),
  "/misc/default/objection.opus": wav(SHOUT_SOUND_MS, 440),
  "/sounds/general/sfx-test.opus": wav(SFX_MS, 660),
  "/evidence.json": JSON.stringify(["test.png"]),
  "/evidence/test.png": png([200, 40, 40]),
};
for (const name of ["phoenix", "edgeworth"]) {
  ASSETS[`/characters/${name}/char.ini`] = name === "phoenix" ? charIni("Phoenix") : charIni("Edgeworth", "aa");
  ASSETS[`/characters/${name}/(a)normal.png`] = png([0, 200, 0]);
  ASSETS[`/characters/${name}/(b)normal.png`] = png([0, 0, 200]);
  ASSETS[`/characters/${name}/slam.apng`] = apng(PREANIM_FRAMES);
}

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".apng": "image/apng",
  ".opus": "audio/wav",
  ".ini": "text/plain",
  ".json": "application/json",
};
const ASSET_PATH = /^\/((characters|sounds|misc|background|themes|evidence)\/|evidence\.json$)/;

export interface Server {
  url: string;
  stop(): void;
}

/** The demo server (serving the built app from dist/) on a free port. */
export async function startServer(): Promise<Server> {
  const proc: Subprocess = spawn(["bun", "server.ts"], { env: { ...process.env, PORT: "0" }, stdout: "pipe", stderr: "inherit" });
  const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();
  let out = "";
  while (!/demo server on (\S+)/.test(out)) {
    const { value, done } = await reader.read();
    if (done) throw new Error(`demo server exited: ${out}`);
    out += new TextDecoder().decode(value);
  }
  void (async () => {
    while (!(await reader.read()).done) {
      /* drain */
    }
  })();
  return { url: out.match(/demo server on (\S+)/)![1], stop: () => proc.kill() };
}

export const launch = () => puppeteer.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });

export interface Recording {
  /** [time, what]: "shout block|none", "sprite <file>", "text <length>". */
  visuals: [number, string][];
  /** Every sound scheduled: when it starts (page time), its length, and when it was stopped. */
  sounds: { at: number; ms: number; stoppedAt: number | null }[];
}

export interface PageOptions {
  /** The output latency the browser reports (0 unless given, e.g. 0.25 for a Bluetooth device). */
  latencyS?: number;
  /** Holds back given asset paths once, by ms. */
  delays?: Record<string, number>;
  /** 1280x800 unless given; `hasTouch` also makes the pointer coarse. */
  viewport?: Viewport;
  /** localStorage entries set before the page first loads. */
  storage?: Record<string, string>;
  /** Fixed responses by exact URL (strings as-is, anything else as JSON), e.g. for the master server list. */
  stubs?: Record<string, unknown>;
}

const wireLogs = new WeakMap<Page, string[]>();

/** Every packet the page sent ("C: ...") and received ("S: ..."), in order. */
export const wires = (page: Page) => wireLogs.get(page) ?? [];

/** A fresh page (own storage) that serves the generated assets and records packets, not yet navigated. */
export async function openPage(browser: Browser, server: Server, options: PageOptions = {}): Promise<Page> {
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport(options.viewport ?? { width: 1280, height: 800 });
  const log: string[] = [];
  wireLogs.set(page, log);
  page.on("console", (m) => {
    if (/^[CS]: /.test(m.text())) log.push(m.text());
  });
  const delays = { ...options.delays };
  await page.setRequestInterception(true);
  page.on("request", async (req) => {
    const stub = options.stubs?.[req.url()];
    if (stub !== undefined) {
      const text = typeof stub === "string";
      return req.respond({
        status: 200,
        contentType: text ? "text/plain" : "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: text ? stub : JSON.stringify(stub),
      });
    }
    const url = new URL(req.url());
    const body = ASSETS[decodeURIComponent(url.pathname)];
    if (url.host !== new URL(server.url).host || !ASSET_PATH.test(decodeURIComponent(url.pathname))) {
      return req.continue();
    }
    const delay = delays[decodeURIComponent(url.pathname)];
    if (delay) {
      delete delays[decodeURIComponent(url.pathname)];
      await new Promise((r) => setTimeout(r, delay));
    }
    if (body === undefined) return req.respond({ status: 404, body: "" });
    const ext = url.pathname.slice(url.pathname.lastIndexOf("."));
    return req.respond({ status: 200, contentType: TYPES[ext] ?? "application/octet-stream", headers: { "access-control-allow-origin": "*" }, body });
  });
  await page.evaluateOnNewDocument((latency) => {
    const w = window as unknown as { __rec: Recording };
    w.__rec = { visuals: [], sounds: [] };
    // Fixed, so results don't depend on the machine's audio device (a Bluetooth headset reports ~200 ms).
    Object.defineProperty(AudioContext.prototype, "outputLatency", { get: () => latency });
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    type Tagged = AudioBufferSourceNode & { rec?: Recording["sounds"][number] };
    AudioBufferSourceNode.prototype.start = function (this: Tagged, when?: number, ...rest: number[]) {
      const ctx = this.context as AudioContext;
      const silent = this.buffer?.getChannelData(0).every((v) => v === 0) ?? true;
      if (!silent) {
        this.rec = { at: performance.now() + Math.max(0, ((when ?? 0) - ctx.currentTime) * 1000), ms: Math.round((this.buffer?.duration ?? 0) * 1000), stoppedAt: null };
        w.__rec.sounds.push(this.rec);
      }
      return start.call(this, when, ...rest);
    };
    AudioBufferSourceNode.prototype.stop = function (this: Tagged, when?: number) {
      if (this.rec && this.rec.stoppedAt === null) this.rec.stoppedAt = performance.now();
      return stop.call(this, when);
    };
  }, options.latencyS ?? 0);
  if (options.storage) {
    await page.goto(`${server.url}/robots.txt`);
    await page.evaluate((entries) => Object.entries(entries).forEach(([k, v]) => localStorage.setItem(k, v)), options.storage);
  }
  return page;
}

export const clientUrl = (server: Server) => `${server.url}/client.html?mode=join&connect=${server.url.replace(/^http/, "ws")}`;

/** Opens the client against `server`; see `PageOptions`. */
export async function openClient(browser: Browser, server: Server, options: PageOptions = {}): Promise<Page> {
  const page = await openPage(browser, server, options);
  await page.goto(clientUrl(server), { waitUntil: "load" });
  return page;
}

/** Picks a character and starts recording the viewport. */
export async function joinAs(page: Page, name: string) {
  await page.waitForSelector(".sheet .tile .pick");
  await page.evaluate((n) => ([...document.querySelectorAll(".sheet .tile .pick")].find((e) => e.textContent?.includes(n)) as HTMLElement).click(), name);
  await page.waitForFunction(() => document.querySelectorAll(".emotes .tile").length === 2, { timeout: 15000 });
  await page.evaluate(() => {
    const rec = (window as unknown as { __rec: Recording }).__rec;
    const log = (what: string) => rec.visuals.push([performance.now(), what]);
    const shout = document.getElementById("client_shout")!;
    new MutationObserver(() => log(`shout ${shout.style.display}`)).observe(shout, { attributes: true, attributeFilter: ["style"] });
    new MutationObserver((ms) => {
      for (const m of ms) {
        const img = m.target as HTMLImageElement;
        if (img.closest(".client_char") && !img.src.startsWith("data:")) log(`sprite ${decodeURIComponent(img.src.split("/").pop()!)}`);
      }
    }).observe(document.getElementById("client_gamewindow")!, { attributes: true, attributeFilter: ["src"], subtree: true });
    const inner = document.getElementById("client_inner_chat")!;
    new MutationObserver(() => log(`text ${inner.textContent?.length ?? 0}`)).observe(inner, { childList: true });
  });
}

/** Sends an IC message through the UI. */
export async function say(page: Page, text: string, options: { emote?: number; shout?: string } = {}) {
  await (await page.$$(".emotes .tile"))[options.emote ?? 0].click();
  await page.evaluate((shout) => {
    const select = [...document.querySelectorAll(".field")].find((f) => f.textContent?.includes("Shout"))!.querySelector("select")!;
    select.value = shout;
    select.dispatchEvent(new Event("change"));
    for (const label of ["Preanim", "SFX"]) {
      const box = [...document.querySelectorAll("label.check")].find((l) => l.textContent?.trim() === label)!.querySelector("input")!;
      if (!box.checked) box.click();
    }
  }, options.shout ?? "none");
  await page.type("#client_inputbox", text);
  await page.keyboard.press("Enter");
}

export const recording = (page: Page) => page.evaluate(() => (window as unknown as { __rec: Recording }).__rec);

export const shownText = (page: Page) => page.evaluate(() => document.getElementById("client_inner_chat")?.textContent ?? "");

/** Waits until the client has the server's character list, then spectates. */
export async function spectate(page: Page) {
  await page.waitForSelector(".sheet .tile .pick");
  await page.click('[aria-label="Spectate"]');
  await page.waitForFunction(() => !document.querySelector(".sheet"));
}

export const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Box = { left: number; top: number; width: number; height: number; right: number; bottom: number };

export const rect = (page: Page, selector: string) =>
  page.$eval(selector, (e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  });

/** Turns the layout's edit mode on or off from the Settings tab. */
export async function setEditMode(page: Page, on: boolean) {
  await page.evaluate((want) => {
    (document.querySelector('[data-tab="settings"]') as HTMLElement).click();
    const box = [...document.querySelectorAll("label.check")].find((l) => l.textContent?.trim() === "Edit mode")!.querySelector("input")!;
    if (box.checked !== want) box.click();
  }, on);
  await settle(200);
}

/** Drags a tab (edit mode) with the mouse and drops it at (x, y). */
export async function dragTab(page: Page, tab: string, x: number, y: number) {
  await page.$eval(`[data-tab="${tab}"]`, (e) => e.scrollIntoView({ block: "nearest", inline: "center" }));
  await settle(150);
  const from = await rect(page, `[data-tab="${tab}"]`);
  await page.mouse.move(from.left + from.width / 2, from.top + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
  await settle(250);
}

type Node = { kind: "group"; tabs: string[] } | { kind: "split"; dir: string; children: Node[] };

/** The saved landscape layout as nested arrays: a group is its tabs, a split is { row | column: [...] }. */
export async function layoutTree(page: Page): Promise<unknown> {
  const saved = await page.evaluate(() => localStorage.getItem("panelLayout") ?? "");
  if (!saved) return null;
  const tree = (n: Node): unknown => (n.kind === "group" ? n.tabs : { [n.dir]: n.children.map(tree) });
  return tree((JSON.parse(saved) as { root: Node }).root);
}

/** Whether every shown panel sits exactly over a slot. */
export const panelsOnSlots = (page: Page) =>
  page.evaluate(() => {
    const slots = [...document.querySelectorAll(".slot, .portrait-viewport")].map((s) => s.getBoundingClientRect());
    return [...document.querySelectorAll<HTMLElement>(".panel")]
      .filter((p) => p.style.display !== "none")
      .every((p) => {
        const r = p.getBoundingClientRect();
        return slots.some((q) => Math.abs(q.left - r.left) < 1 && Math.abs(q.top - r.top) < 1 && Math.abs(q.width - r.width) < 1 && Math.abs(q.height - r.height) < 1);
      });
  });
