import { test, expect } from "bun:test";
import { orderTabs, DEFAULT_TABS } from "../ui/client/tabs";

const ids = (order: string[]) => orderTabs(order).map((t) => t.id);

test("no saved order keeps the defaults", () => {
  expect(ids([])).toEqual(DEFAULT_TABS.map((t) => t.id));
});

test("saved tabs come first, the rest keep their default order", () => {
  expect(ids(["menu", "log"])).toEqual(["menu", "log", "emotes", "ooc", "areas", "music", "players", "background", "evidence"]);
});

test("unknown ids from an older build are ignored", () => {
  expect(ids(["gone", "ooc"])).toEqual(["ooc", "emotes", "log", "areas", "music", "players", "background", "evidence", "menu"]);
});
