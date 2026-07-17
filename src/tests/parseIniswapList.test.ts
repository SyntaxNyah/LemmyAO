import { describe, it, expect } from "bun:test";
import { parseIniswapList } from "../utils/parseIniswapList";

describe("parseIniswapList", () => {
  it("returns one name per line", () => {
    expect(parseIniswapList("iniswap1\niniswap2\niniswap3")).toEqual([
      "iniswap1",
      "iniswap2",
      "iniswap3",
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseIniswapList("a\r\nb\r\n")).toEqual(["a", "b"]);
  });

  it("skips blank lines and trims whitespace", () => {
    expect(parseIniswapList("  a  \n\n   \nb")).toEqual(["a", "b"]);
  });

  it("skips # comment lines", () => {
    expect(parseIniswapList("# my swaps\na\n#b\nc")).toEqual(["a", "c"]);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseIniswapList("")).toEqual([]);
  });
});
