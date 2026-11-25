import { env } from '~/env';

/**
 * Normalizes a base URL to its ASCII origin: an internationalized host like
 * `leiksvæði.is` becomes its punycode form `xn--leiksvi-rxa4g.is`, and any
 * trailing slash or path is dropped. Sitemaps, canonical links and robots.txt
 * must use RFC 3986 URLs, which allow only ASCII hosts.
 */
export function toAsciiOrigin(url: string): string {
  return new URL(url).origin;
}

function resolveBaseUrl(): string {
  // A configured base URL wins in every environment
  if (env.NEXT_PUBLIC_BASE_URL) {
    return env.NEXT_PUBLIC_BASE_URL;
  }

  // Check for Vercel URL (only for preview deployments)
  if (process.env.VERCEL_URL && process.env.NODE_ENV !== 'production') {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Production fallback - use your actual domain
  return 'https://leiksvæði.is';
}

/**
 * Get the correct base URL for the application
 * Handles different environments: development, Vercel deployments, and production
 */
export function getBaseUrl(): string {
  return toAsciiOrigin(resolveBaseUrl());
}
