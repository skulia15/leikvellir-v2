import { createHash } from "node:crypto";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const DNS_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Derive a deterministic, non-reversible, URL-safe path segment identifying
 * the uploader without exposing the raw database user ID in public blob URLs.
 */
export function getUploaderPrefix(userId: string): string {
  const hash = createHash("sha256")
    .update(`leikvellir-uploader:${userId}`)
    .digest("hex")
    .slice(0, 16);
  return `u-${hash}`;
}

/**
 * Validate a filename parameter for safe blob path construction.
 */
export function isSafeBlobFilename(filename: string): boolean {
  if (!SAFE_FILENAME_REGEX.test(filename)) {
    return false;
  }
  if (filename === "." || filename === ".." || filename.includes("..")) {
    return false;
  }
  return true;
}

/**
 * Extract and validate path segments from a URL pathname.
 * Returns null if the pathname is outside `/playgrounds/`, contains traversal,
 * empty segments, invalid percent-encoding, or encoded slashes/backslashes.
 */
function getValidatedPlaygroundSegments(pathname: string): string[] | null {
  if (!pathname.startsWith("/playgrounds/")) {
    return null;
  }

  const rawSegments = pathname.slice(1).split("/");
  // Must be either:
  //   ["playgrounds", "<filename>"] (legacy uploads)
  //   ["playgrounds", "u-<hash>", "<filename>"] (owner-scoped uploads)
  if (rawSegments.length < 2 || rawSegments.length > 3) {
    return null;
  }

  const decodedSegments: string[] = [];
  for (const segment of rawSegments) {
    if (!segment) {
      return null;
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (
      !decoded ||
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\")
    ) {
      return null;
    }
    decodedSegments.push(decoded);
  }

  if (decodedSegments[0] !== "playgrounds") {
    return null;
  }

  return decodedSegments;
}

export interface ValidatedBlobUrl {
  url: string;
  parsed: URL;
  segments: string[];
}

/**
 * Strictly validate a Vercel Blob URL:
 * - Must parse with `new URL(rawUrl)`
 * - Protocol must be `https:`
 * - No credentials, non-default port, query string, or hash
 * - Hostname must be `<storeId>.public.blob.vercel-storage.com` with a single valid DNS label
 * - If `expectedStoreId` is configured, `<storeId>` must match it (case-insensitively)
 * - Pathname must be under `/playgrounds/` with valid, non-traversal segments
 */
export function parseAndValidateBlobUrl(
  rawUrl: string,
  expectedStoreId?: string,
): ValidatedBlobUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  if (parsed.username || parsed.password || parsed.port) {
    return null;
  }

  if (parsed.search || parsed.hash) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith(BLOB_HOST_SUFFIX)) {
    return null;
  }

  const storeId = hostname.slice(0, -BLOB_HOST_SUFFIX.length);
  if (!DNS_LABEL_REGEX.test(storeId)) {
    return null;
  }

  const trimmedExpected = expectedStoreId?.trim();
  if (trimmedExpected) {
    if (!DNS_LABEL_REGEX.test(trimmedExpected)) {
      return null;
    }
    if (storeId !== trimmedExpected.toLowerCase()) {
      return null;
    }
  }

  const segments = getValidatedPlaygroundSegments(parsed.pathname);
  if (!segments) {
    return null;
  }

  // Canonicalize percent-encoding so DB lookup and blob deletion target the exact same URL
  const canonicalPathname = `/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
  const canonicalUrl = `${parsed.origin}${canonicalPathname}`;

  return {
    url: canonicalUrl,
    parsed: new URL(canonicalUrl),
    segments,
  };
}

/**
 * Check whether a validated blob URL belongs to the given uploader's
 * scoped prefix (`/playgrounds/u-<hash>/<filename>`).
 */
export function isBlobOwnedByUser(
  validated: ValidatedBlobUrl,
  userId: string,
): boolean {
  if (validated.segments.length !== 3) {
    return false;
  }
  return (
    validated.segments[0] === "playgrounds" &&
    validated.segments[1] === getUploaderPrefix(userId) &&
    Boolean(validated.segments[2])
  );
}
