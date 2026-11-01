import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["viem", "@x402/evm", "@x402/fetch", "@x402/core"],
};

export default nextConfig;
