#!/usr/bin/env node
/**
 * Assembles a self-contained bundle for cPanel (Octenium) hosting.
 *
 * `next build` with `output: "standalone"` traces what the server needs
 * and copies it into `.next/standalone` — but deliberately leaves out
 * two things, because they are served as plain files rather than
 * required by the server: the static chunks and `public/`. Uploading
 * only the standalone folder gives a site that renders HTML and then
 * loads no CSS or JavaScript at all, which is the single most common way
 * a self-hosted Next deploy goes wrong.
 *
 * This puts all three together in `dist/octenium`, ready to upload.
 */
import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps", "web");
const out = join(root, "dist", "octenium");

const need = [
  [join(web, ".next", "standalone"), "run `pnpm bundle` — a plain build does not produce this"],
  [join(web, ".next", "static"), "the build did not finish"],
];
for (const [path, hint] of need) {
  if (!existsSync(path)) {
    console.error(`✗ missing ${path}\n  ${hint}`);
    process.exit(1);
  }
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// 1. The traced server and its minimal node_modules.
await cp(join(web, ".next", "standalone"), out, { recursive: true });

// 2. The static chunks, where the server expects to find them.
await cp(join(web, ".next", "static"), join(out, "apps", "web", ".next", "static"), {
  recursive: true,
});

// 3. Anything served verbatim.
if (existsSync(join(web, "public"))) {
  await cp(join(web, "public"), join(out, "apps", "web", "public"), { recursive: true });
}

/*
  cPanel's Node.js selector wants ONE startup file at the application
  root. The traced server sits at apps/web/server.js because the build
  preserves the workspace layout, so this hands Passenger a file where it
  looks for one and forwards to the real server.
*/
await writeFile(
  join(out, "server.js"),
  `/**
 * Entry point for cPanel's Node.js application manager.
 *
 * Passenger starts this file from the application root and provides
 * PORT. The real server is the one Next traced; it reads PORT itself,
 * so this only has to point at it.
 */
require("./apps/web/server.js");
`,
  "utf8"
);

/*
  A package.json at the root keeps the Node selector happy and pins the
  engine, so an account left on an old Node fails loudly here rather than
  with a syntax error somewhere inside the framework.
*/
const version = JSON.parse(await readFile(join(web, "package.json"), "utf8")).version ?? "0.1.0";
await writeFile(
  join(out, "package.json"),
  `${JSON.stringify(
    {
      name: "tyriaq-web",
      version,
      private: true,
      scripts: { start: "node server.js" },
      engines: { node: ">=18.18" },
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`✓ bundle ready: dist/octenium`);
console.log(`  upload its CONTENTS to the application root on the server`);
console.log(`  startup file: server.js`);
