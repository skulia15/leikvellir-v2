// env.js
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    // Make OAuth credentials optional in development
    DISCORD_CLIENT_ID:
      process.env.NODE_ENV === "development"
        ? z.string().optional()
        : z.string(),
    DISCORD_CLIENT_SECRET:
      process.env.NODE_ENV === "development"
        ? z.string().optional()
        : z.string(),
    // Google OAuth credentials
    GOOGLE_CLIENT_ID:
      process.env.NODE_ENV === "development"
        ? z.string().optional()
        : z.string(),
    GOOGLE_CLIENT_SECRET:
      process.env.NODE_ENV === "development"
        ? z.string().optional()
        : z.string(),
    // Facebook OAuth credentials
    FACEBOOK_CLIENT_ID:
      process.env.NODE_ENV === "development"
        ? z.string().optional()
        : z.string(),
    FACEBOOK_CLIENT_SECRET:
      process.env.NODE_ENV === "development"
        ? z.string().optional()
        : z.string(),
    // Discord webhook for admin notifications (new submissions, edit suggestions,
    // and contact form submissions). Optional - notifications are skipped/logged if unset.
    DISCORD_ADMIN_WEBHOOK_URL: z.string().url().optional(),
    // Vercel Blob storage token for leikvellir_image_store
    leikvellir_image_store_READ_WRITE_TOKEN:
      process.env.NODE_ENV === "development"
        ? z.string().optional()
        : z.string(),
    // Optional Vercel Blob store ID used to strictly validate blob URLs and filename deletes
    BLOB_STORE_ID: z.string().min(1).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string(),
    // PostHog Analytics
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
    // Base URL for sitemap generation
    NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID,
    FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    DISCORD_ADMIN_WEBHOOK_URL: process.env.DISCORD_ADMIN_WEBHOOK_URL,
    leikvellir_image_store_READ_WRITE_TOKEN:
      process.env.leikvellir_image_store_READ_WRITE_TOKEN,
    BLOB_STORE_ID: process.env.BLOB_STORE_ID,
    // PostHog Analytics
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Base URL for sitemap generation
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
