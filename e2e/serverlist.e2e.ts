import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Browser, Page } from "puppeteer";
import { launch, openPage, settle, startServer, type Server } from "./harness";

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

const SERVERS = [
  { name: "Plain Court", ip: "plain.example", ws_port: 27015, players: 3, description: "Unencrypted." },
  { name: "Secure Court", ip: "secure.example", wss_port: 443, players: 9, description: "Encrypted." },
  { name: "Desktop Only", ip: "tcp.example", port: 27016, players: 1 },
  { name: "Another Desktop", ip: "tcp2.example", port: 27016, players: 0 },
];

async function serverList(): Promise<Page> {
  const page = await openPage(browser, server, {
    stubs: {
      "https://servers.aceattorneyonline.com/servers": SERVERS,
      "https://servers.umineko.online/servers": [],
      "https://servers.aceattorneyonline.com/version": "2.10.1",
    },
  });
  await page.goto(`${server.url}/index.html`, { waitUntil: "load" });
  await page.waitForSelector("li.row");
  return page;
}

const rows = (page: Page) =>
  page.$$eval(".list > li.row", (rs) =>
    rs.map((r) => ({
      name: r.querySelector(".name")?.textContent?.trim(),
      badges: [...r.querySelectorAll(".badge")].map((b) => b.textContent?.trim()),
      badgeAfterName: r.querySelector(".label .name + .badge") !== null,
      join: (r.querySelector("a.join") as HTMLAnchorElement | null)?.getAttribute("href") ?? null,
    })),
  );

describe("server list", () => {
  test("web servers are listed by players; only secure ones get a badge, right after the name", async () => {
    const page = await serverList();
    const listed = (await rows(page)).filter((r) => r.join);
    expect(listed.map((r) => r.name)).toEqual(["Secure Court", "Plain Court"]);
    expect(listed.map((r) => r.badges)).toEqual([["Secure"], []]);
    expect(listed[0].badgeAfterName).toBe(true);
  });

  test("servers the browser can't reach are summed up at the bottom", async () => {
    const page = await serverList();
    const summary = await page.$eval(".desktop-only summary", (s) => s.textContent?.replace(/\s+/g, " ").trim());
    expect(summary).toBe("2 servers don't support web");
  });

  test("join links carry the socket readable, and an unencrypted one loads the client over http", async () => {
    const page = await serverList();
    const [secure, plain] = (await rows(page)).filter((r) => r.join);
    expect(plain.join).toBe(`${server.url.replace(/^https?:/, "http:")}/client.html?mode=join&serverName=Plain+Court&connect=ws://plain.example:27015`);
    expect(secure.join).toEndWith("&connect=wss://secure.example:443");
  });

  test("search narrows the list", async () => {
    const page = await serverList();
    await page.type('[aria-label="Search servers"]', "plain");
    await settle(200);
    expect((await rows(page)).filter((r) => r.join).map((r) => r.name)).toEqual(["Plain Court"]);
  });

  test("direct connect rejects garbage and joins a host:port", async () => {
    const page = await serverList();
    await page.type("#direct", "not a server!");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".direct .error");
    await page.$eval("#direct", (e) => ((e as HTMLInputElement).value = ""));
    await page.type("#direct", "127.0.0.1:50001");
    await Promise.all([page.waitForNavigation(), page.keyboard.press("Enter")]);
    expect(page.url()).toContain("client.html?mode=join&connect=ws://127.0.0.1:50001");
  });
});
