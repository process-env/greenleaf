import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@greenleaf/db", "@greenleaf/ai", "@greenleaf/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.leafly.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
