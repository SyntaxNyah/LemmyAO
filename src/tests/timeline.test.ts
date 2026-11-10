import { describe, expect, test } from "bun:test";
import { buildTimeline, PREANIM_MARGIN_MS, type TimelineEvent, type TimelineInput } from "../viewport/timeline";

const base: TimelineInput = { shoutMs: 0, preanimMs: 0, nonInterrupting: false, chars: [...""], speedMs: 60, sfxDelayMs: null };
const kinds = (events: TimelineEvent[]) => events.filter((e) => e.kind !== "blip" && e.kind !== "char").map((e) => `${e.kind}@${e.at}`);
const reveals = (events: TimelineEvent[]) =>
  events.flatMap((e) => (e.kind === "char" ? [`${e.index}@${e.at}`] : []));

describe("buildTimeline", () => {
  test("shout, preanim, talking and idle come in order", () => {
    const events = buildTimeline({ ...base, shoutMs: 720, preanimMs: 1000, chars: [..."Hi"] });
    const talk = 720 + 1000 - PREANIM_MARGIN_MS;
    expect(kinds(events)).toEqual(["shout@0", "preanim@720", `talk@${talk}`, `idle@${talk + 120}`]);
    expect(reveals(events)).toEqual([`0@${talk + 60}`, `1@${talk + 120}`]);
  });

  test("times never go backwards", () => {
    const events = buildTimeline({ ...base, shoutMs: 840, preanimMs: 500, sfxDelayMs: 2000, chars: [..."a {b}\\p3c\\sd"] });
    for (let i = 1; i < events.length; i++) expect(events[i].at).toBeGreaterThanOrEqual(events[i - 1].at);
  });

  test("without a shout or preanim, talking starts at once", () => {
    const events = buildTimeline({ ...base, chars: [..."ok"] });
    expect(kinds(events)).toEqual(["preanim@0", "talk@0", "idle@120"]);
  });

  test("spaces reveal but don't blip", () => {
    const events = buildTimeline({ ...base, chars: [..."a b"] });
    expect(events.filter((e) => e.kind === "blip").map((e) => e.at)).toEqual([60, 180]);
    expect(reveals(events)).toEqual(["0@60", "1@120", "2@180"]);
  });

  test("{ slows and } speeds up the text without showing", () => {
    const events = buildTimeline({ ...base, chars: [..."a{{bc}d"] });
    // a@60; {{ +40 -> 100, b shown in the same step; c@220; } -20 -> 80, d in the same step.
    expect(reveals(events)).toEqual(["0@60", "3@120", "4@220", "6@320"]);
  });

  test("\\p pauses in tenths of a second, \\s and \\f take their time", () => {
    const events = buildTimeline({ ...base, chars: [..."a\\p3b\\sc\\fd"] });
    expect(reveals(events)).toEqual(["0@60", "4@480", "7@800", "10@1320"]);
    expect(events.filter((e) => e.kind === "shake" || e.kind === "flash").map((e) => `${e.kind}@${e.at}`)).toEqual([
      "shake@540",
      "flash@860",
    ]);
  });

  test("the emote sound waits for the shout plus its delay", () => {
    const events = buildTimeline({ ...base, shoutMs: 720, sfxDelayMs: 200, chars: [..."x"] });
    expect(events.find((e) => e.kind === "sfx")?.at).toBe(920);
  });

  test("a non-interrupting preanim talks over the animation", () => {
    const long = buildTimeline({ ...base, preanimMs: 1000, nonInterrupting: true, chars: [..."x".repeat(30)] });
    expect(kinds(long)).toEqual(["preanim@0", "chatbox@0", `talk@${1000 - PREANIM_MARGIN_MS}`, "idle@1800"]);
    expect(reveals(long)[0]).toBe("0@60");

    // Done before the preanim ends: straight to idle when it does.
    const short = buildTimeline({ ...base, preanimMs: 1000, nonInterrupting: true, chars: [..."hi"] });
    expect(kinds(short)).toEqual(["preanim@0", "chatbox@0", `idle@${1000 - PREANIM_MARGIN_MS}`]);
  });

  test("a blank message goes straight to idle", () => {
    expect(kinds(buildTimeline({ ...base, shoutMs: 720 }))).toEqual(["shout@0", "preanim@720", "talk@720", "idle@720"]);
  });
});
