/**
 * Serves the TIBYAN PRODUCTION build for visual checks.
 *
 * `next dev` proved unusable for this: Fast Refresh kept serving a
 * previously compiled copy of an edited component, so a screenshot
 * showed the old design and the investigation chased a bug that was
 * only in the dev server's module cache. A production build is what
 * ships and is compiled once.
 *
 * Same cwd reasoning as dev-tibyan.mjs — see the note there.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const appDir = join(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  "tibyan-full-project 2",
  "tibyan-app"
);

const port = process.argv[2] ?? "3101";

const nextBin = join(appDir, "node_modules", "next", "dist", "bin", "next");

spawn(process.execPath, [nextBin, "start", "-p", port], {
  cwd: appDir,
  stdio: "inherit",
  env: process.env,
}).on("exit", (code) => process.exit(code ?? 0));
