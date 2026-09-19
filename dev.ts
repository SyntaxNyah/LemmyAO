import index from "./public/index.html";
import client from "./public/client.html";
import vmdviewer from "./public/vmdviewer.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 8080),
  routes: {
    "/": index,
    "/index.html": index,
    "/client.html": client,
    "/vmdviewer": vmdviewer,
    "/vmdviewer.html": vmdviewer,
  },
  // Fallback for runtime-loaded assets (theme CSS, audio, fonts, etc.).
  // `dev-assets/` is a gitignored local mirror for testing characters/
  // backgrounds against the dev server without a remote AO host.
  async fetch(req) {
    const url = new URL(req.url);
    const pub = Bun.file(`./public${url.pathname}`);
    if (await pub.exists()) return new Response(pub);
    const local = Bun.file(`./dev-assets${decodeURIComponent(url.pathname)}`);
    if (await local.exists()) return new Response(local);
    return new Response("Not found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`[dev] http://localhost:${server.port}`);
