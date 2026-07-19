import { describe, it, expect } from "bun:test";
import { parseBackgroundFolderListing } from "../utils/parseBackgroundFolderListing";

describe("parseBackgroundFolderListing", () => {
  it("returns one name per subfolder link (nginx autoindex style)", () => {
    const html = `
      <html><head><title>Index of /background/</title></head>
      <body><h1>Index of /background/</h1><hr><pre>
      <a href="../">../</a>
      <a href="Courtroom/">Courtroom/</a>
      <a href="Prosecutors_Office/">Prosecutors_Office/</a>
      </pre><hr></body></html>`;
    expect(parseBackgroundFolderListing(html)).toEqual([
      "Courtroom",
      "Prosecutors_Office",
    ]);
  });

  it("returns one name per subfolder link (Apache autoindex style)", () => {
    const html = `
      <table>
      <tr><td><a href="/background/">Parent Directory</a></td></tr>
      <tr><td><a href="Blank/">Blank/</a></td></tr>
      <tr><td><a href="Gs4/">Gs4/</a></td></tr>
      </table>`;
    expect(parseBackgroundFolderListing(html)).toEqual(["Blank", "Gs4"]);
  });

  it("skips file links, only keeping folders", () => {
    const html = `
      <a href="../">../</a>
      <a href="Courtroom/">Courtroom/</a>
      <a href="readme.txt">readme.txt</a>`;
    expect(parseBackgroundFolderListing(html)).toEqual(["Courtroom"]);
  });

  it("skips sort-order query links", () => {
    const html = `
      <a href="?C=N;O=D">Name</a>
      <a href="Courtroom/">Courtroom/</a>`;
    expect(parseBackgroundFolderListing(html)).toEqual(["Courtroom"]);
  });

  it("skips absolute and root-relative links", () => {
    const html = `
      <a href="http://example.com/background/Other/">Other/</a>
      <a href="/elsewhere/">elsewhere/</a>
      <a href="Courtroom/">Courtroom/</a>`;
    expect(parseBackgroundFolderListing(html)).toEqual(["Courtroom"]);
  });

  it("decodes percent-encoded folder names", () => {
    const html = `<a href="My%20BG/">My BG/</a>`;
    expect(parseBackgroundFolderListing(html)).toEqual(["My BG"]);
  });

  it("dedupes repeated links and sorts the result", () => {
    const html = `
      <a href="Zeta/">Zeta/</a>
      <a href="Alpha/">Alpha/</a>
      <a href="Alpha/">Alpha/</a>`;
    expect(parseBackgroundFolderListing(html)).toEqual(["Alpha", "Zeta"]);
  });

  it("returns an empty array when there are no folder links", () => {
    expect(parseBackgroundFolderListing("<html><body>Nothing here</body></html>")).toEqual([]);
    expect(parseBackgroundFolderListing("")).toEqual([]);
  });
});
