import { env } from '~/env';

/**
 * Get the correct base URL for the application
 * Handles different environments: development, Vercel deployments, and production
 */
export function getBaseUrl(): string {
  // Always use configured base URL in production
  if (process.env.NODE_ENV === 'production' && env.NEXT_PUBLIC_BASE_URL) {
    return env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Check if we have a configured base URL (for any environment)
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
  return 'https://leiksvaedi.is';
}
