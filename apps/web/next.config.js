const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@flow/ui", "@flow/types", "@flow/utils", "@flow/config"],
  reactStrictMode: true,

  /*
    This app lives in a pnpm workspace, so its dependencies are hoisted
    to the repository root — two directories up. Without being told, Next
    infers the tracing root from the nearest lockfile it can find, warns
    about the ambiguity, and can leave workspace packages out of the
    serverless bundle it builds for deployment.
  */
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

module.exports = nextConfig;
