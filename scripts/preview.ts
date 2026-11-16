import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projects } from "../src/projects.ts";
import { renderPortfolio } from "../src/render.ts";

const production = process.argv.includes("--production");
const root = fileURLToPath(
  new URL(production ? "../dist/" : "../public/", import.meta.url),
);
const html = production
  ? await readFile(resolve(root, "index.html"))
  : renderPortfolio(projects);
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://localhost").pathname,
    );
    if (pathname === "/" || pathname === "/index.html") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      response.end(request.method === "HEAD" ? undefined : html);
      return;
    }
    const file = resolve(root, `.${pathname}`);
    const withinRoot = relative(root, file);
    if (withinRoot.startsWith("..") || isAbsolute(withinRoot)) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response
      .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      .end("Файл не найден.");
  }
});

server.listen(4173, "127.0.0.1", () =>
  console.log("Portfolio ready at http://127.0.0.1:4173"),
);
