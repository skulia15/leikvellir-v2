/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { env } from "./src/env.js";

import type { NextConfig } from "next";

const config: NextConfig = {
  // Transpile packages that need special handling with Turbopack/pnpm
  transpilePackages: ["fridagar"],
  
  images: {
    // Enable modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Optimize image quality vs file size
    minimumCacheTTL: 31536000, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // Vercel Blob Storage (playground images)
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      // OAuth provider avatars
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      // External playground images
      {
        protocol: "https",
        hostname: "www.oskarsson.is",
      },
      // Allow localhost for development
      ...(process.env.NODE_ENV === "development"
        ? [
            { protocol: "http" as const, hostname: "localhost" },
          ]
        : []),
    ],
  },
  // Enable TypeScript support for React 18 with Pages Router
  // While using React 19 with App Router
  experimental: {
    // Disable client-side router cache in dev for fresh data on every navigation
    staleTimes:
      process.env.NODE_ENV === "development"
        ? { dynamic: 0, static: 0 }
        : { dynamic: 30, static: 180 },
  },
  
  // Modern browser targeting to reduce polyfills
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Enables externals bundling for Pages Router like in App Router
  bundlePagesRouterDependencies: true,

  // Security and cache headers
  async headers() {
    return [
      // Security headers for all routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      // Cache static assets (JS, CSS, images) for 1 year
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache images optimized by Next.js for 1 year
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache PostHog static assets for longer (1 week)
      {
        source: "/ingest/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      // Cache public assets (favicon, manifest, etc.) for 1 week
      {
        source: "/(favicon.ico|icon.png|manifest.json|robots.txt|sitemap.xml)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      // Cache font files for 1 year
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Optimize page caching for bfcache
      {
        source: "/(playground|playgrounds)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },

  // PostHog rewrites to proxy analytics requests
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default config;
