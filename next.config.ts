import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components (and the partial prefetching built on it) hang every page on Cloudflare Workers
  // until OpenNext ships https://github.com/opennextjs/opennextjs-cloudflare/pull/1318. Turn both back on then.
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
