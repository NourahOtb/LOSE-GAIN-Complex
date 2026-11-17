import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // shared TypeScript package (prices, schedule helpers) from the monorepo
  transpilePackages: ["@lg/shared"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
