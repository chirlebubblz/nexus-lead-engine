import type { NextConfig } from "next";

const nextConfig: any = {
  // Let Next.js handle symlinks naturally
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
