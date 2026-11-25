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

const inputValue = (page: Page, id: string) =>
  page.$eval(`#${id}`, (element) => (element as HTMLInputElement).value);

const typeOffset = async (page: Page, id: string, value: string) => {
  const selector = `#${id}`;
  await page.click(selector);
  await page.$eval(selector, (element) => ((element as HTMLInputElement).value = ""));
  await page.type(selector, value);
};

const dotStyle = (page: Page, side: "left" | "top") =>
  page.$eval(".pad .dot", (element, axis) => (element as HTMLElement).style[axis], side);

const setLock = (page: Page, label: string, checked: boolean) =>
  page.evaluate(
    ({ text, want }) => {
      const field = [...document.querySelectorAll("label.check")].find(
        (element) => element.textContent?.trim() === text,
      );
      const input = field?.querySelector("input");
      if (!input) throw new Error(`${text} checkbox not found`);
      if (input.checked !== want) input.click();
    },
    { text: label, want: checked },
  );

describe("offset numeric inputs", () => {
  test("type exact values, wheel them and clamp out-of-range input", async () => {
    const page = await openClient(browser, server);
    await joinAs(page, "Phoenix");
    await page.waitForFunction(() => !document.querySelector(".sheet"));
    await page.waitForSelector("#offset-x");

    expect(await inputValue(page, "offset-x")).toBe("0");
    expect(await inputValue(page, "offset-y")).toBe("0");

    await typeOffset(page, "offset-x", "20");
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => (document.querySelector("#offset-x") as HTMLInputElement).value === "20");
    expect(await dotStyle(page, "left")).toBe("60%");

    await page.hover("#offset-x");
    const beforeWheel = Number(await inputValue(page, "offset-x"));
    await page.mouse.wheel({ deltaY: -100 });
    await page.waitForFunction(
      (old) => Number((document.querySelector("#offset-x") as HTMLInputElement).value) > old,
      {},
      beforeWheel,
    );
    const afterWheel = Number(await inputValue(page, "offset-x"));
    expect(afterWheel).toBeGreaterThan(beforeWheel);
    expect(await dotStyle(page, "left")).toBe(`${(afterWheel + 100) / 2}%`);

    // Vertical starts locked; unlock it before typing.
    await setLock(page, "Lock Y", false);
    await page.waitForFunction(() => !(document.querySelector("#offset-y") as HTMLInputElement).disabled);
    await typeOffset(page, "offset-y", "15");
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => (document.querySelector("#offset-y") as HTMLInputElement).value === "15");
    expect(await dotStyle(page, "top")).toBe("57.5%");

    await typeOffset(page, "offset-x", "150");
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => (document.querySelector("#offset-x") as HTMLInputElement).value === "100");
    expect(await dotStyle(page, "left")).toBe("100%");

    await setLock(page, "Lock X", true);
    await page.waitForFunction(() => (document.querySelector("#offset-x") as HTMLInputElement).disabled);
  });
});