import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { opusCheck } from "../dom/opusCheck";

let warn: ReturnType<typeof spyOn>;

// The bug only reproduces against a real document URL: an empty `src`
// attribute resolves against the document, so `channel.src` reads back as
// the page URL. happy-dom defaults to about:blank, where it reads back as
// "" and the loop is invisible.
const PAGE_URL =
  "https://webao.example/client.html?mode=join&connect=wss://server.example:443";

beforeEach(() => {
  (globalThis as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL(
    PAGE_URL,
  );
  warn = spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

/** Finds the `src` accessor, which lives up on HTMLMediaElement.prototype. */
function srcDescriptor(el: object): PropertyDescriptor {
  for (let p = Object.getPrototypeOf(el); p; p = Object.getPrototypeOf(p)) {
    const desc = Object.getOwnPropertyDescriptor(p, "src");
    if (desc?.set) return desc;
  }
  throw new Error("no src accessor on the prototype chain");
}

/**
 * Simulates the browser: assigning `src` re-invokes the media load
 * algorithm *even when the value is unchanged*, so a failing sound
 * re-enters the handler. Returns how many times the error handler ran
 * before the element stopped reloading; maxRounds means it never stopped.
 */
function runErrorLoop(initialSrc: string | null, maxRounds = 50): number {
  const channel = document.createElement("audio");
  if (initialSrc !== null) channel.src = initialSrc;

  const desc = srcDescriptor(channel);
  let assigned = false;
  Object.defineProperty(channel, "src", {
    configurable: true,
    get: () => desc.get!.call(channel),
    set: (v: string) => {
      assigned = true;
      desc.set!.call(channel, v);
    },
  });

  let rounds = 0;
  do {
    assigned = false;
    rounds++;
    opusCheck(channel);
  } while (assigned && rounds < maxRounds);
  return rounds;
}

describe("opusCheck", () => {
  test("retries a .mp3 as .opus exactly once", () => {
    const channel = document.createElement("audio");
    channel.src = "https://cdn.example/sounds/general/sfx-stab.mp3";
    opusCheck(channel);
    expect(channel.getAttribute("src")).toBe(
      "https://cdn.example/sounds/general/sfx-stab.opus",
    );
    // Second failure has nothing left to try and must not reassign.
    opusCheck(channel);
    expect(channel.getAttribute("src")).toBe(
      "https://cdn.example/sounds/general/sfx-stab.opus",
    );
  });

  test("rewrites .wav and preserves a query string", () => {
    const channel = document.createElement("audio");
    channel.src = "https://cdn.example/sounds/general/blip.wav?v=2";
    opusCheck(channel);
    expect(channel.getAttribute("src")).toBe(
      "https://cdn.example/sounds/general/blip.opus?v=2",
    );
  });

  test("does not loop on an extensionless URL", () => {
    // Regression: the old handler reassigned the unchanged URL, which
    // restarted the load and spammed the console until the tab was closed.
    expect(runErrorLoop("https://cdn.example/sounds/music/")).toBe(1);
  });

  test("does not loop when src was cleared with an empty string", () => {
    // Regression: `channel.src` reads back as the document URL for an empty
    // attribute, so the old `audio === ""` guard never fired and the client
    // page itself was retried as a sound, forever.
    expect(runErrorLoop("")).toBe(1);
  });

  test("clears an empty src instead of reporting the document as a sound", () => {
    const channel = document.createElement("audio");
    channel.src = "";
    opusCheck(channel);
    expect(channel.hasAttribute("src")).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  test("ignores a channel that never had a src", () => {
    expect(runErrorLoop(null)).toBe(1);
    expect(warn).not.toHaveBeenCalled();
  });

  test("warns once per failed sound", () => {
    const channel = document.createElement("audio");
    channel.src = "https://cdn.example/sounds/general/missing.opus";
    opusCheck(channel);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
