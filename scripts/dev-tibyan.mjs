/**
 * Starts the TIBYAN dev server with its own directory as the working
 * directory.
 *
 * `next dev <dir>` tells Next where the app is but does not change
 * process.cwd(), and several things in this app read from cwd rather than
 * from the app directory — Tailwind's content globs most visibly. Started
 * from the repository root, Tailwind matches no files, emits no
 * utilities, and every page fails with "the `bg-bg-light` class does not
 * exist", which looks like a broken theme rather than a wrong directory.
 *
 * This exists because .claude/launch.json has no `cwd` option and `npm
 * --prefix` cannot run in the sandbox.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/*
  The live TIBYAN project, which is NOT under this repository: it sits
  beside it in ~/Downloads. The copy at tibyan-full-project/tibyan-app
  inside this repo is an older snapshot — pointing the dev server at it
  once cost an afternoon of "my change did not appear", so the path is
  spelled out here rather than derived from this file's location.
*/
const appDir = join(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  "tibyan-full-project 2",
  "tibyan-app"
);
const nextBin = join(appDir, "node_modules", "next", "dist", "bin", "next");

const port = process.argv[2] ?? "3100";

const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  cwd: appDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
