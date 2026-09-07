const path = require("path");

/** Content globs are resolved from __dirname rather than written
 * relative to the process working directory: Tailwind resolves relative
 * globs against cwd, so a bare "./app/**" silently matches nothing
 * whenever Next is started from the monorepo root (`next dev apps/web`)
 * instead of from this directory — which produces a stylesheet with no
 * utility classes and a confusing "class does not exist" build error.
 * Anchoring to __dirname makes the config correct from any cwd.
 *
 * @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@flow/config/tailwind-preset.js")],
  content: [
    path.join(__dirname, "app/**/*.{ts,tsx}"),
    path.join(__dirname, "components/**/*.{ts,tsx}"),
    path.join(__dirname, "../../packages/ui/src/**/*.{ts,tsx}"),
  ],
};
