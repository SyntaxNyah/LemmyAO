import { describe, it, expect } from "bun:test";
import { IMAGE_EXTENSIONS, fileNameExtension } from "../utils/assetName";

// char.ini legacy stems are unsanitised: they may contain dots that are part of
// the emote's numbering rather than a file extension. Reading those as
// filenames blanks the sprite (the beelzebub "gun" emotes: 11.1/11.2/11.3).
// These pin the distinction the sprite ladder relies on.

describe("fileNameExtension", () => {
  it("returns null for a legacy stem whose dot is not an extension", () => {
    expect(fileNameExtension("images/11.1-presenting-gun")).toBeNull();
    expect(fileNameExtension("images/11.1-Presenting-Gun")).toBeNull();
    expect(fileNameExtension("1.5-normal")).toBeNull();
  });

  it("returns null for a plain legacy stem", () => {
    expect(fileNameExtension("normal")).toBeNull();
    expect(fileNameExtension("images/1-presenting")).toBeNull();
    expect(fileNameExtension("/22-oh shit")).toBeNull();
  });

  it("returns null when only digits trail the last dot", () => {
    expect(fileNameExtension("images/11.1")).toBeNull();
    expect(fileNameExtension("wave.2")).toBeNull();
  });

  it("returns the lowercased extension of a literal filename", () => {
    expect(fileNameExtension("wave.png")).toBe(".png");
    expect(fileNameExtension("1-presenting.webp")).toBe(".webp");
    expect(fileNameExtension("idle.VMD")).toBe(".vmd");
  });

  it("returns the extension of a URL's last segment", () => {
    expect(fileNameExtension("https://host/characters/phoenix/(a)normal.webp")).toBe(".webp");
    expect(fileNameExtension("https://host/characters/phoenix/11.1-presenting-gun")).toBeNull();
  });

  it("knows which extensions are renderable sprites", () => {
    expect(IMAGE_EXTENSIONS).toContain(".webp");
    expect(IMAGE_EXTENSIONS).not.toContain(".vmd");
  });
});
