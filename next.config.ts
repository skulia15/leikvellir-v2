/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { env } from "./src/env.js";

import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      // Allow localhost for development
      {
        protocol: "http",
        hostname: "localhost",
      },
      // Also add for any development ports
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
      },
      // Add your local network IP if needed
      {
        protocol: "http",
        hostname: "172.21.54.94", // From your dev server output
      },
    ],
  },
  // Enable TypeScript support for React 18 with Pages Router
  // While using React 19 with App Router
  experimental: {
    // New in Next.js 15: Configure static page stale times
    staleTimes: {
      dynamic: 30, // 30 seconds for dynamic pages
      static: 180, // 3 minutes for static pages
    },
  },
  // Enables externals bundling for Pages Router like in App Router
  bundlePagesRouterDependencies: true,
};

export default config;
