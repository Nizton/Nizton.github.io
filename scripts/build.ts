import { cp, mkdir, rename, writeFile } from "node:fs/promises";
import { projects } from "../src/projects.ts";
import { renderPortfolio } from "../src/render.ts";

// Validate and render before touching the existing output.
const html = renderPortfolio(projects);
const output = new URL("../dist/", import.meta.url);
await mkdir(output, { recursive: true });
await cp(new URL("../public/", import.meta.url), output, { recursive: true });
const temporaryHtml = new URL(`index-${process.pid}.tmp`, output);
await writeFile(temporaryHtml, html);
await rename(temporaryHtml, new URL("index.html", output));
console.log(`Built dist/index.html with ${projects.length} project(s).`);
