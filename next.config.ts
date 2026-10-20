import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache components temporarily disabled for the hackathon build: this
  // Next release's prerenderer crashes (useContext null) on every route
  // while the flag is on. Domain behavior doesn't use cache APIs.
  // cacheComponents: true,
  // partialPrefetching: true,
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
