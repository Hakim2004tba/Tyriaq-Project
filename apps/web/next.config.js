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
    Self-hosted on cPanel, so the build has to produce something that can
    RUN somewhere else.

    `standalone` traces the files the server actually needs and copies
    them — including the workspace packages — into `.next/standalone`,
    with its own minimal `node_modules` and a `server.js` that listens on
    `PORT`. That is what makes this deployable to shared hosting at all:
    the alternative is installing a pnpm workspace of ~1 GB on a box with
    a few hundred megabytes of memory and no pnpm.
  */
  output: "standalone",
};

module.exports = nextConfig;
