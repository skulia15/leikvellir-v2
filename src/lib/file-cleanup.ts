import { del } from "@vercel/blob";
import { env } from "~/env";
import { logger } from "~/lib/logging/logger";

const VERCEL_BLOB_HOSTNAME_REGEX =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.public\.blob\.vercel-storage\.com$/;

/**
 * Resolve the configured Vercel Blob read/write token.
 */
function getBlobToken(): string | undefined {
  const token =
    env.leikvellir_image_store_READ_WRITE_TOKEN ||
    env.BLOB_READ_WRITE_TOKEN ||
    process.env.leikvellir_image_store_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN;

  return token?.trim() || undefined;
}

/**
 * Validate and normalize a Vercel Blob Storage URL.
 * Returns the canonical `https://<store>.public.blob.vercel-storage.com/<path>` URL
 * or `null` if the input is not a valid public Vercel Blob URL.
 */
export function normalizeVercelBlobUrl(url: string): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.port !== "") return null;
  if (!VERCEL_BLOB_HOSTNAME_REGEX.test(parsed.hostname)) return null;
  if (!parsed.pathname || parsed.pathname === "/") return null;

  return `${parsed.origin}${parsed.pathname}`;
}

/**
 * Strictly validate whether a URL belongs to Vercel Blob Storage
 * (`https://*.public.blob.vercel-storage.com/...`).
 */
export function isVercelBlobUrl(url: string): boolean {
  return normalizeVercelBlobUrl(url) !== null;
}

/**
 * Delete orphaned Vercel Blob URLs that were present in `oldImages`
 * and are no longer referenced in `newImages`.
 */
export async function deleteOrphanedFiles(
  oldImages: string[],
  newImages: string[],
): Promise<void> {
  const oldBlobUrls = new Set<string>();
  for (const url of oldImages) {
    const normalized = normalizeVercelBlobUrl(url);
    if (normalized) {
      oldBlobUrls.add(normalized);
    }
  }

  if (oldBlobUrls.size === 0) return;

  const newBlobUrls = new Set<string>();
  for (const url of newImages) {
    const normalized = normalizeVercelBlobUrl(url);
    if (normalized) {
      newBlobUrls.add(normalized);
    }
  }

  const urlsToDelete = [...oldBlobUrls].filter((url) => !newBlobUrls.has(url));
  if (urlsToDelete.length === 0) return;

  const token = getBlobToken();
  if (!token) {
    logger.warn(
      "Skipping Vercel Blob orphan cleanup: missing blob storage token",
      {
        component: "FileCleanup",
        action: "delete_orphaned_files",
        metadata: { count: urlsToDelete.length },
      },
    );
    return;
  }

  try {
    await del(urlsToDelete, { token });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Failed to delete orphaned Vercel Blob files",
      {
        component: "FileCleanup",
        action: "delete_orphaned_files",
        metadata: {
          count: urlsToDelete.length,
          urls: urlsToDelete,
        },
      },
      err,
    );
  }
}

/**
 * Delete a single Vercel Blob file by URL.
 */
export async function deleteFileByUrl(url: string): Promise<boolean> {
  const normalizedUrl = normalizeVercelBlobUrl(url);
  if (!normalizedUrl) {
    logger.warn("Refusing to delete non-Vercel Blob URL", {
      component: "FileCleanup",
      action: "delete_file_by_url",
      metadata: { url },
    });
    return false;
  }

  const token = getBlobToken();
  if (!token) {
    logger.warn("Skipping Vercel Blob deletion: missing blob storage token", {
      component: "FileCleanup",
      action: "delete_file_by_url",
      metadata: { url: normalizedUrl },
    });
    return false;
  }

  try {
    await del(normalizedUrl, { token });
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Failed to delete Vercel Blob file",
      {
        component: "FileCleanup",
        action: "delete_file_by_url",
        metadata: { url: normalizedUrl },
      },
      err,
    );
    return false;
  }
}