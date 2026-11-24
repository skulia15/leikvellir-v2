import { z } from "zod";

/**
 * Matches valid single-label Vercel Blob public store hostnames:
 * `<store-id>.public.blob.vercel-storage.com`
 */
const VERCEL_BLOB_HOST_REGEX =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.public\.blob\.vercel-storage\.com$/;

/**
 * Known allowed non-Vercel-Blob remote hostnames for playground images
 * (kept in sync with `images.remotePatterns` in `next.config.ts`).
 */
export const ALLOWED_REMOTE_IMAGE_HOSTS = new Set<string>([
  "www.oskarsson.is",
]);

/**
 * Safe relative local upload paths (e.g. `/uploads/playgrounds/image.jpg`).
 * Disallows protocol-relative URLs (`//...`), query strings, fragments,
 * backslashes, whitespace, and path traversal segments (`.` or `..`).
 */
const SAFE_LOCAL_UPLOAD_PATH_REGEX =
  /^\/uploads\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/;

export const MAX_PHOTOS_PER_CALL = 8;
export const MAX_PLAYGROUND_IMAGES = 50;

export interface ImageUrlValidationOptions {
  /**
   * Optional exact Vercel Blob hostname (e.g. `my-store.public.blob.vercel-storage.com`)
   * to pin validation to a single configured store.
   */
  allowedStoreHost?: string;
}

function getConfiguredStoreHost(
  options?: ImageUrlValidationOptions,
): string | undefined {
  const configured =
    options?.allowedStoreHost ?? process.env.NEXT_PUBLIC_BLOB_STORE_HOST;
  const trimmed = configured?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function parseStrictHttpsUrl(rawUrl: string): URL | null {
  if (!rawUrl || rawUrl !== rawUrl.trim()) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  // Reject embedded credentials and non-default ports
  if (parsed.username !== "" || parsed.password !== "" || parsed.port !== "") {
    return null;
  }

  // Require a non-empty path beyond root "/"
  if (!parsed.pathname || parsed.pathname === "/") {
    return null;
  }

  return parsed;
}

/**
 * Strictly validates that `rawUrl` is an HTTPS URL pointing to a Vercel Blob
 * public store (`https://<storeId>.public.blob.vercel-storage.com/...`),
 * optionally pinned to a specific store host.
 */
export function isVercelBlobUrl(
  rawUrl: string,
  options?: ImageUrlValidationOptions,
): boolean {
  const parsed = parseStrictHttpsUrl(rawUrl);
  if (!parsed) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!VERCEL_BLOB_HOST_REGEX.test(hostname)) {
    return false;
  }

  const allowedStoreHost = getConfiguredStoreHost(options);
  if (allowedStoreHost && hostname !== allowedStoreHost) {
    return false;
  }

  return true;
}

/**
 * Strictly validates that `rawUrl` is an allowlisted remote HTTPS image URL
 * (Vercel Blob public store or a known allowed remote playground image host).
 */
export function isAllowedRemoteImageUrl(
  rawUrl: string,
  options?: ImageUrlValidationOptions,
): boolean {
  if (isVercelBlobUrl(rawUrl, options)) {
    return true;
  }

  const parsed = parseStrictHttpsUrl(rawUrl);
  if (!parsed) {
    return false;
  }

  return ALLOWED_REMOTE_IMAGE_HOSTS.has(parsed.hostname.toLowerCase());
}

/**
 * Validates safe relative local upload paths under `/uploads/` without path traversal.
 */
export function isSafeLocalUploadPath(rawPath: string): boolean {
  if (!SAFE_LOCAL_UPLOAD_PATH_REGEX.test(rawPath)) {
    return false;
  }

  const segments = rawPath.split("/").slice(1);
  return segments.every((segment) => segment !== "." && segment !== "..");
}

/**
 * Validates playground image references: either an allowlisted remote HTTPS URL
 * or a safe local `/uploads/...` path.
 */
export function isAllowedImageUrl(
  rawUrl: string,
  options?: ImageUrlValidationOptions,
): boolean {
  return isAllowedRemoteImageUrl(rawUrl, options) || isSafeLocalUploadPath(rawUrl);
}

/** Zod schema for remote-only allowlisted HTTPS image URLs (e.g. `addPhotos`). */
export const RemoteImageUrlSchema = z.string().refine(
  (url) => isAllowedRemoteImageUrl(url),
  { message: "Must be an allowed HTTPS image URL" },
);

/** Zod schema for playground image URLs (allowlisted HTTPS URL or safe `/uploads/` path). */
export const PlaygroundImageUrlSchema = z.string().refine(
  (url) => isAllowedImageUrl(url),
  { message: "Must be an allowed image URL or upload path" },
);
