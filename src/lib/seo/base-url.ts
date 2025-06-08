import { env } from '~/env';

/**
 * Get the correct base URL for the application
 * Handles different environments: development, Vercel deployments, and production
 */
export function getBaseUrl(): string {
  // Check if we have a configured base URL
  if (env.NEXT_PUBLIC_BASE_URL) {
    return env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Check for Vercel URL (automatically provided by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Production fallback - you should set NEXT_PUBLIC_BASE_URL in production
  return 'https://leiksvaedi.is';
}
