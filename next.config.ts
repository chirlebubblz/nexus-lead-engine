import type { NextConfig } from "next";

const nextConfig: any = {
  // Let Next.js handle symlinks naturally
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
