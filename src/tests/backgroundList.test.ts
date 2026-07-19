import { describe, it, expect, beforeEach, mock } from "bun:test";

const ctMock = mock((_args: { name: string; message: string }) => {});
let requestImpl: (url: string) => Promise<string> = async () => "";

const clientMock = {
  server: {
    send: { CT: ctMock },
    receive: mock((_wire: string) => {}),
  },
};

mock.module("../client", () => ({ client: clientMock }));
mock.module("../client/aoHost", () => ({
  AO_HOST: "http://assets.test/base/",
}));
mock.module("../services/request", () => ({
  default: (url: string) => requestImpl(url),
  request: (url: string) => requestImpl(url),
}));
mock.module("../utils/queryParser", () => ({
  default: () => ({ mode: "join" }),
}));
mock.module("../dom/updateBackgroundPreview", () => ({
  default: async (url: string) => `resolved:${url}`,
}));

const {
  openBackgroundList,
  closeBackgroundList,
  pickBackground,
  backgroundlist_filter,
} = await import("../dom/backgroundList");

function setupDom() {
  document.body.innerHTML = `
    <input id="OOC_name" value="Phoenix" />
    <div id="client_backgroundselect" style="display: none">
      <div id="client_backgroundpanel">
        <input id="client_backgroundsearch" />
        <p id="client_backgroundstatus"></p>
        <div id="client_backgroundtable"></div>
      </div>
    </div>`;
}

describe("backgroundList", () => {
  beforeEach(() => {
    setupDom();
    ctMock.mockClear();
    clientMock.server.receive.mockClear();
  });

  it("opens the overlay and builds a slot per subfolder in the listing", async () => {
    requestImpl = async (url) => {
      expect(url).toBe("http://assets.test/base/background/");
      return `
        <a href="../">../</a>
        <a href="Courtroom/">Courtroom/</a>
        <a href="Gs4/">Gs4/</a>`;
    };
    await openBackgroundList();

    const overlay = document.getElementById("client_backgroundselect")!;
    expect(overlay.style.display).toBe("flex");

    const imgs = [
      ...document.querySelectorAll<HTMLImageElement>(
        "#client_backgroundtable img",
      ),
    ];
    expect(imgs.map((i) => i.title)).toEqual(["Courtroom", "Gs4"]);
    expect(imgs[0].dataset.action).toBe("pickBackground");
    expect(imgs[0].dataset.background).toBe("Courtroom");
    expect(
      document.getElementById("client_backgroundstatus")!.textContent,
    ).toBe("");
  });

  it("shows a message when the background/ folder isn't browsable", async () => {
    requestImpl = async () => {
      throw new Error("404");
    };
    await openBackgroundList();

    expect(
      document.getElementById("client_backgroundstatus")!.textContent,
    ).toContain("doesn't provide a browsable background list");
    expect(
      document.querySelectorAll("#client_backgroundtable img").length,
    ).toBe(0);
  });

  it("shows a message when the folder listing has no subfolders", async () => {
    requestImpl = async () => `<a href="../">../</a><a href="readme.txt">readme.txt</a>`;
    await openBackgroundList();

    expect(
      document.getElementById("client_backgroundstatus")!.textContent,
    ).toContain("empty");
  });

  it("pickBackground sends the bg command and closes the overlay", async () => {
    requestImpl = async () => `<a href="Courtroom/">Courtroom/</a>`;
    await openBackgroundList();
    pickBackground("Courtroom");

    expect(ctMock).toHaveBeenCalledWith({
      name: "Phoenix",
      message: "/bg Courtroom",
    });
    expect(
      document.getElementById("client_backgroundselect")!.style.display,
    ).toBe("none");
  });

  it("pickBackground does nothing for an empty name", () => {
    pickBackground("");
    expect(ctMock).not.toHaveBeenCalled();
  });

  it("filter hides non-matching slots", async () => {
    requestImpl = async () =>
      `<a href="Courtroom/">Courtroom/</a><a href="Courthouse/">Courthouse/</a><a href="Gs4/">Gs4/</a>`;
    await openBackgroundList();

    (<HTMLInputElement>(
      document.getElementById("client_backgroundsearch")
    )).value = "court";
    backgroundlist_filter(new Event("input"));

    const slots = [
      ...document.querySelectorAll<HTMLElement>(
        "#client_backgroundtable .char-slot",
      ),
    ];
    expect(slots.map((s) => s.style.display)).toEqual([
      "inline-block",
      "inline-block",
      "none",
    ]);
  });

  it("closeBackgroundList hides the overlay", () => {
    document.getElementById("client_backgroundselect")!.style.display =
      "flex";
    closeBackgroundList();
    expect(
      document.getElementById("client_backgroundselect")!.style.display,
    ).toBe("none");
  });
});
