import { createReadStream, existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

// Dev-only helpers for the `?demo` tool (localhost; reads arbitrary paths):
// `/@list?dir=<path>` lists a directory's subfolders (the character roster),
// `/@local/<abspath>` serves a file off disk (a `localasset` folder).
// `dev-assets/` is a gitignored local mirror for testing characters/backgrounds
// without a remote AO host.
function devAssets(): Plugin {
  const sendFile = (res: import("node:http").ServerResponse, file: string) => {
    res.setHeader("Content-Length", statSync(file).size);
    createReadStream(file).pipe(res);
  };
  return {
    name: "lemmyao-dev-assets",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const path = decodeURIComponent(url.pathname);

        if (path === "/@list") {
          const dir = url.searchParams.get("dir");
          if (!dir) {
            res.statusCode = 400;
            return res.end("missing dir");
          }
          try {
            const entries = await readdir(dir, { withFileTypes: true });
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify(entries.filter((e) => e.isDirectory()).map((e) => e.name)));
          } catch {
            res.statusCode = 404;
            return res.end("not found");
          }
        }
        if (path.startsWith("/@local/")) {
          const file = path.slice("/@local".length);
          if (existsSync(file) && statSync(file).isFile()) return sendFile(res, file);
          res.statusCode = 404;
          return res.end("Not found");
        }

        const local = resolve("dev-assets", `.${path}`);
        if (local.startsWith(resolve("dev-assets")) && existsSync(local) && statSync(local).isFile()) {
          return sendFile(res, local);
        }
        next();
      });
    },
  };
}

// The app shell is precached; AO asset hosts and game servers are never cached.
const pwa = VitePWA({
  registerType: "prompt",
  injectRegister: false,
  includeAssets: ["favicon.ico", "logo-new.png", "icons/apple-touch-icon.png"],
  manifest: {
    name: "LemmyAO",
    short_name: "LemmyAO",
    description: "Play Attorney Online in your browser",
    start_url: "./index.html",
    scope: "./",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#0f1115",
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["*.html", "assets/*.{js,css}", "icons/*.png", "*.{ico,png}"],
    // client.html?connect=... must match the precached client.html.
    ignoreURLParametersMatching: [/.*/],
    navigateFallback: null,
    // Registers its fetch handler before workbox's, so it runs first.
    importScripts: ["insecure-redirect.js"],
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    runtimeCaching: [
      {
        // Chatbox skins and fonts load on demand.
        urlPattern: ({ url }) =>
          url.href.startsWith(`${(self as unknown as { registration: { scope: string } }).registration.scope}styles/`),
        handler: "StaleWhileRevalidate",
        options: { cacheName: "lemmyao-styles", expiration: { maxEntries: 200 } },
      },
    ],
  },
});

// HTTPS=1 serves the dev server over self-signed https, for secure-context features (e.g. the mic) on a phone.
// Installing needs a trusted certificate, so test that on a real deployment.
const https = !!process.env.HTTPS;

export default defineConfig({
  plugins: [vue(), devAssets(), pwa, ...(https ? [basicSsl()] : [])],
  base: "./",
  server: { port: 8080 },
  build: {
    outDir: "dist",
    sourcemap: true,
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        client: resolve(import.meta.dirname, "client.html"),
      },
    },
  },
});
