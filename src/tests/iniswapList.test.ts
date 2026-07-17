import { describe, it, expect, beforeEach, mock } from "bun:test";

const changeCharMock = mock(async (_id: number) => {});
const handleCharacterInfoMock = mock(
  async (_chargs: string[], _id: number) => {},
);
let requestImpl: (url: string) => Promise<string> = async () => "";

const clientMock = {
  charID: 0,
  charicon_extensions: [".png"],
  chars: [] as unknown[],
};

mock.module("../client", () => ({ client: clientMock }));
mock.module("../client/aoHost", () => ({
  AO_HOST: "http://assets.test/base/",
}));
mock.module("../client/changeChar", () => ({ changeChar: changeCharMock }));
mock.module("../client/handleCharacterInfo", () => ({
  handleCharacterInfo: handleCharacterInfoMock,
}));
mock.module("../services/request", () => ({
  default: (url: string) => requestImpl(url),
  request: (url: string) => requestImpl(url),
}));

const { openIniswapList, closeIniswapList, pickIniswap, iniswaplist_filter } =
  await import("../dom/iniswapList");

function setupDom() {
  document.body.innerHTML = `
    <div id="client_iniswapselect" style="display: none">
      <div id="client_iniswappanel">
        <input id="client_iniswapsearch" />
        <p id="client_iniswapstatus"></p>
        <div id="client_iniswaptable"></div>
      </div>
    </div>`;
}

describe("iniswapList", () => {
  beforeEach(() => {
    setupDom();
    clientMock.charID = 0;
    changeCharMock.mockClear();
    handleCharacterInfoMock.mockClear();
  });

  it("opens the overlay and builds a slot per listed iniswap", async () => {
    requestImpl = async (url) => {
      expect(url).toBe("http://assets.test/base/iniswap.txt");
      return "# comment\niniswap1\niniswap2\n\niniswap3\n";
    };
    await openIniswapList();

    const overlay = document.getElementById("client_iniswapselect")!;
    expect(overlay.style.display).toBe("flex");

    const imgs = [
      ...document.querySelectorAll<HTMLImageElement>(
        "#client_iniswaptable img",
      ),
    ];
    expect(imgs.map((i) => i.title)).toEqual([
      "iniswap1",
      "iniswap2",
      "iniswap3",
    ]);
    expect(imgs[0].src).toBe(
      "http://assets.test/base/characters/iniswap1/char_icon.png",
    );
    expect(imgs[0].dataset.action).toBe("pickIniswap");
    expect(imgs[0].dataset.iniswap).toBe("iniswap1");
    expect(
      document.getElementById("client_iniswapstatus")!.textContent,
    ).toBe("");
  });

  it("shows a message when iniswap.txt is missing", async () => {
    requestImpl = async () => {
      throw new Error("404");
    };
    await openIniswapList();

    expect(
      document.getElementById("client_iniswapstatus")!.textContent,
    ).toContain("doesn't provide an iniswap list");
    expect(
      document.querySelectorAll("#client_iniswaptable img").length,
    ).toBe(0);
  });

  it("shows a message when the list is empty", async () => {
    requestImpl = async () => "\n# only comments\n";
    await openIniswapList();

    expect(
      document.getElementById("client_iniswapstatus")!.textContent,
    ).toContain("empty");
  });

  it("pickIniswap swaps the current character and closes the overlay", async () => {
    requestImpl = async () => "iniswap1";
    await openIniswapList();
    await pickIniswap("iniswap1");

    expect(handleCharacterInfoMock).toHaveBeenCalledWith(["iniswap1"], 0);
    expect(changeCharMock).toHaveBeenCalledWith(0);
    expect(
      document.getElementById("client_iniswapselect")!.style.display,
    ).toBe("none");
  });

  it("pickIniswap refuses while spectating", async () => {
    requestImpl = async () => "iniswap1";
    await openIniswapList();
    clientMock.charID = -1;
    await pickIniswap("iniswap1");

    expect(handleCharacterInfoMock).not.toHaveBeenCalled();
    expect(changeCharMock).not.toHaveBeenCalled();
    expect(
      document.getElementById("client_iniswapstatus")!.textContent,
    ).toContain("Pick a character first");
  });

  it("filter hides non-matching slots", async () => {
    requestImpl = async () => "iniswap1\niniswap2\nother";
    await openIniswapList();

    (<HTMLInputElement>(
      document.getElementById("client_iniswapsearch")
    )).value = "iniswap";
    iniswaplist_filter(new Event("input"));

    const slots = [
      ...document.querySelectorAll<HTMLElement>(
        "#client_iniswaptable .char-slot",
      ),
    ];
    expect(slots.map((s) => s.style.display)).toEqual([
      "inline-block",
      "inline-block",
      "none",
    ]);
  });

  it("closeIniswapList hides the overlay", async () => {
    document.getElementById("client_iniswapselect")!.style.display = "flex";
    closeIniswapList();
    expect(
      document.getElementById("client_iniswapselect")!.style.display,
    ).toBe("none");
  });
});
