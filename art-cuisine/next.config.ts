import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Document uploads are read into memory as data URLs (see lib/actions/documents.ts).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
