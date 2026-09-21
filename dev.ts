import { readdir } from "node:fs/promises";
import index from "./public/index.html";
import client from "./public/client.html";

function resolvePort() {
  const args = process.argv.slice(2);
  const flag = args.findIndex((a) => a === "--port" || a === "-p");
  if (flag !== -1 && args[flag + 1]) return Number(args[flag + 1]);
  const inline = args.find((a) => a.startsWith("--port="));
  if (inline) return Number(inline.slice("--port=".length));
  const positional = args.find((a) => /^\d+$/.test(a));
  if (positional) return Number(positional);
  return Number(process.env.PORT ?? 8080);
}

const server = Bun.serve({
  port: resolvePort(),
  routes: {
    "/": index,
    "/index.html": index,
    "/client.html": client,
  },
  // Fallback for runtime-loaded assets (theme CSS, audio, fonts, etc.).
  // `dev-assets/` is a gitignored local mirror for testing characters/
  // backgrounds against the dev server without a remote AO host.
  async fetch(req) {
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname);

    // Dev-only helpers for the `?demo` tool (localhost; reads arbitrary paths):
    // `/@list?dir=<path>` lists a directory's subfolders (the character roster),
    // `/@local/<abspath>` serves a file off disk (a `localasset` folder).
    if (path === "/@list") {
      const dir = url.searchParams.get("dir");
      if (!dir) return new Response("missing dir", { status: 400 });
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        return Response.json(entries.filter((e) => e.isDirectory()).map((e) => e.name));
      } catch {
        return new Response("not found", { status: 404 });
      }
    }
    if (path.startsWith("/@local/")) {
      const file = Bun.file(path.slice("/@local".length)); // keeps the leading "/"
      if (await file.exists()) return new Response(file);
      return new Response("Not found", { status: 404 });
    }

    const pub = Bun.file(`./public${url.pathname}`);
    if (await pub.exists()) return new Response(pub);
    const local = Bun.file(`./dev-assets${path}`);
    if (await local.exists()) return new Response(local);
    return new Response("Not found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`[dev] http://localhost:${server.port}`);
