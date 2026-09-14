const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@flow/ui", "@flow/types", "@flow/utils", "@flow/config"],
  reactStrictMode: true,

  /*
    This app lives in a pnpm workspace, so its dependencies are hoisted
    to the repository root — two directories up. Without being told, Next
    infers the tracing root from the nearest lockfile it can find and can
    leave workspace packages out of the bundle it assembles.
  */
  outputFileTracingRoot: path.join(__dirname, "../../"),

  /*
    Two hosts, two answers.

    On cPanel the build has to produce something that can RUN somewhere
    else: `standalone` traces the files the server needs and copies them
    — workspace packages included — into `.next/standalone`, with its own
    minimal `node_modules` and a `server.js` that listens on `PORT`. That
    is what makes shared hosting possible at all; the alternative is
    installing a ~1 GB pnpm workspace on a box with a few hundred
    megabytes of memory and no pnpm.

    Vercel needs none of that and builds the app its own way, so the
    setting is off unless something asks for it. `scripts/bundle-for-
    octenium.mjs` sets BUILD_TARGET before building. Leaving it on for
    both was what broke every Vercel deploy after the hosting change.
  */
  ...(process.env.BUILD_TARGET === "octenium" ? { output: "standalone" } : {}),
};

module.exports = nextConfig;
