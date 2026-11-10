import { createReadStream, existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

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

export default defineConfig({
  plugins: [vue(), devAssets()],
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
