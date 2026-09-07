/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@flow/ui", "@flow/types", "@flow/utils", "@flow/config"],
  reactStrictMode: true,
};

module.exports = nextConfig;
