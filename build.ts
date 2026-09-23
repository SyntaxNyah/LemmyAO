import { rm, cp, readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

await rm("./dist", { recursive: true, force: true });

// Copy public/ first so the HTML and runtime-loaded assets (theme CSS, audio,
// fonts, chatbox skins) land at their original paths; Bun.build writes the
// bundled HTML/JS/CSS over the entry HTML files.
await cp("./public", "./dist", { recursive: true });

// The two pages have disjoint code, so build each HTML entrypoint on its own.
// `splitting` is on so dynamic imports (the opus WASM fallback in voice.ts) stay
// lazy in their own chunk. Bun's HTML bundler handles CSS + hashed assets, but
// under splitting it points the emitted <script> at the wrong chunk (a shared
// babylon-mmd shader chunk) while the real code lands in the chunk it tags as
// the "entry-point" output. Repoint the module <script> at that entry chunk.
for (const html of ["index.html", "client.html"]) {
  const result = await Bun.build({
    entrypoints: [`./public/${html}`],
    outdir: "./dist",
    target: "browser",
    minify: true,
    sourcemap: "linked",
    splitting: true,
  });
  if (!result.success) {
    for (const msg of result.logs) console.error(msg);
    process.exit(1);
  }

  const entry = result.outputs.find(
    (o) => o.kind === "entry-point" && o.path.endsWith(".js"),
  );
  if (!entry) {
    console.error(`no JS entry-point emitted for ${html}`);
    process.exit(1);
  }

  const out = `./dist/${html}`;
  const src = `./${basename(entry.path)}`;
  const rewritten = new HTMLRewriter()
    .on('script[type="module"]', {
      element(el) {
        el.setAttribute("src", src);
      },
    })
    .transform(await readFile(out, "utf8"));
  await writeFile(out, rewritten);
}

console.log("✓ built -> ./dist");
