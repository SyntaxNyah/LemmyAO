import { beforeEach, describe, expect, it, mock } from "bun:test";

const clientMock = { emote_extensions: [".webp"] };

mock.module("../client", () => ({ client: clientMock }));
mock.module("../client/aoHost", () => ({
  AO_HOST: "http://assets.test/base/",
}));
mock.module("../utils/assetCache", () => ({
  resolveAndPreloadImage: async (urls: string[]) => urls[0],
}));

const { clearGroup, renderGroupPeers } = await import(
  "../viewport/groupRender"
);

const speakerID = 10;

function member(charID: number, name: string): {
  uid: number;
  char_id: number;
  name: string;
  emote: string;
  side: string;
  offset: { x: number; y: number };
  flip: string;
  order: number;
} {
  return {
    uid: charID,
    char_id: charID,
    name,
    emote: "normal",
    side: "def",
    offset: { x: 0, y: 0 },
    flip: "none",
    order: charID,
  };
}

function setupDom(): void {
  document.body.innerHTML = `
    <div id="client_gamewindow">
      <div id="client_fullview">
        <div id="client_def_pair_char" class="client_char"></div>
        <div id="client_def_char" class="client_char"></div>
        <div id="client_wit_pair_char" class="client_char"></div>
        <div id="client_wit_char" class="client_char"></div>
        <div id="client_pro_pair_char" class="client_char"></div>
        <div id="client_pro_char" class="client_char"></div>
      </div>
      <div id="client_classicview">
        <div id="client_pair_char" class="client_char"></div>
        <div id="client_char" class="client_char"></div>
      </div>
    </div>
    <div id="client_chatcontainer"></div>`;
}

const byID = (id: string) => document.getElementById(id);
const charIDs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLImageElement>("img")).map(
    (img) => img.dataset.charid,
  );

describe("renderGroupPeers", () => {
  beforeEach(() => {
    setupDom();
    clearGroup();
  });

  it("splits the roster around the speaker's own position", () => {
    renderGroupPeers(
      [member(1, "front"), member(speakerID, "speaker"), member(2, "back")],
      speakerID,
      "def",
      { honorOrder: true },
    );

    const speaker = byID("client_def_char")!;
    const behind = byID("client_group_behind")!;
    const front = byID("client_group_front")!;

    expect(behind.nextElementSibling).toBe(speaker);
    expect(speaker.nextElementSibling).toBe(front);
    expect(charIDs(front)).toEqual(["1"]);
    expect(charIDs(behind)).toEqual(["2"]);
    // The speaker must stay on its own live layer, never be duplicated.
    expect(charIDs(front)).not.toContain(String(speakerID));
    expect(charIDs(behind)).not.toContain(String(speakerID));
  });

  it("keeps every peer behind when the speaker is front-most", () => {
    renderGroupPeers(
      [member(speakerID, "speaker"), member(2, "back")],
      speakerID,
      "def",
      { honorOrder: true },
    );

    const speaker = byID("client_def_char")!;
    const behind = byID("client_group_behind")!;
    expect(byID("client_group_front")).toBeNull();
    expect(behind.nextElementSibling).toBe(speaker);
    expect(charIDs(behind)).toEqual(["2"]);
  });

  it("puts every peer in front when the speaker is back-most", () => {
    renderGroupPeers(
      [member(1, "front"), member(speakerID, "speaker")],
      speakerID,
      "def",
      { honorOrder: true },
    );

    const speaker = byID("client_def_char")!;
    const front = byID("client_group_front")!;
    expect(byID("client_group_behind")).toBeNull();
    expect(speaker.nextElementSibling).toBe(front);
    expect(charIDs(front)).toEqual(["1"]);
  });

  it("paints front-most members last on both sides of the speaker", () => {
    renderGroupPeers(
      [
        member(1, "front-most"),
        member(2, "front-near"),
        member(speakerID, "speaker"),
        member(3, "back-near"),
        member(4, "back-most"),
      ],
      speakerID,
      "def",
      { honorOrder: true },
    );

    // Appended front-to-back within each container, so the lowest roster index
    // is last (painted on top).
    expect(charIDs(byID("client_group_front")!)).toEqual(["2", "1"]);
    expect(charIDs(byID("client_group_behind")!)).toEqual(["4", "3"]);
  });

  it("anchors to the classic view when the speaker is not on a full-view side", () => {
    renderGroupPeers(
      [member(1, "front"), member(speakerID, "speaker"), member(2, "back")],
      speakerID,
      "jud",
      { honorOrder: true },
    );

    const speaker = byID("client_char")!;
    const behind = byID("client_group_behind")!;
    const front = byID("client_group_front")!;
    expect(behind.parentElement).toBe(byID("client_classicview"));
    expect(front.parentElement).toBe(byID("client_classicview"));
    expect(behind.nextElementSibling).toBe(speaker);
    expect(speaker.nextElementSibling).toBe(front);
  });

  it("defaults to all-behind when honorOrder is not requested", () => {
    renderGroupPeers(
      [member(1, "front"), member(speakerID, "speaker"), member(2, "back")],
      speakerID,
      "def",
    );

    expect(byID("client_group_front")).toBeNull();
    expect(charIDs(byID("client_group_behind")!)).toEqual(["2", "1"]);
  });

  it("clears both containers when the group dissolves", () => {
    renderGroupPeers(
      [member(1, "front"), member(speakerID, "speaker"), member(2, "back")],
      speakerID,
      "def",
      { honorOrder: true },
    );
    clearGroup();

    expect(byID("client_group_behind")).toBeNull();
    expect(byID("client_group_front")).toBeNull();
  });
});
