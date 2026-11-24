// __tests__/lib/file-cleanup.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockDel, mockLoggerWarn, mockLoggerError, mockEnv } = vi.hoisted(
  () => ({
    mockDel: vi.fn().mockResolvedValue(undefined),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
    mockEnv: {
      leikvellir_image_store_READ_WRITE_TOKEN: undefined as string | undefined,
      BLOB_READ_WRITE_TOKEN: undefined as string | undefined,
    },
  }),
);

vi.mock("@vercel/blob", () => ({
  del: mockDel,
}));

vi.mock("~/env", () => ({
  env: mockEnv,
}));

vi.mock("~/lib/logging/logger", () => ({
  logger: {
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

import {
  isVercelBlobUrl,
  normalizeVercelBlobUrl,
  deleteOrphanedFiles,
  deleteFileByUrl,
} from "~/lib/file-cleanup";

const BLOB_BASE = "https://abc123store.public.blob.vercel-storage.com";

describe("file-cleanup utilities", () => {
  const originalStoreToken = process.env.leikvellir_image_store_READ_WRITE_TOKEN;
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.leikvellir_image_store_READ_WRITE_TOKEN = "store-token-123";
    mockEnv.BLOB_READ_WRITE_TOKEN = undefined;
    delete process.env.leikvellir_image_store_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  afterEach(() => {
    if (originalStoreToken === undefined) {
      delete process.env.leikvellir_image_store_READ_WRITE_TOKEN;
    } else {
      process.env.leikvellir_image_store_READ_WRITE_TOKEN = originalStoreToken;
    }
    if (originalBlobToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
    }
  });

  describe("normalizeVercelBlobUrl / isVercelBlobUrl", () => {
    it("should accept valid Vercel Blob Storage URLs", () => {
      const url = `${BLOB_BASE}/playgrounds/test-image_123.jpg`;
      expect(isVercelBlobUrl(url)).toBe(true);
      expect(normalizeVercelBlobUrl(url)).toBe(url);
    });

    it("should strip query parameters and hash fragments when normalizing", () => {
      const url = `${BLOB_BASE}/playgrounds/image.jpg?download=1#top`;
      expect(normalizeVercelBlobUrl(url)).toBe(
        `${BLOB_BASE}/playgrounds/image.jpg`,
      );
    });

    it("should reject non-HTTPS Vercel Blob URLs", () => {
      const url =
        "http://abc123store.public.blob.vercel-storage.com/playgrounds/image.jpg";
      expect(isVercelBlobUrl(url)).toBe(false);
      expect(normalizeVercelBlobUrl(url)).toBeNull();
    });

    it("should reject spoofed hostnames and invalid subdomains", () => {
      const invalidUrls = [
        "https://evil.com/.public.blob.vercel-storage.com/playgrounds/a.jpg",
        "https://abc123store.public.blob.vercel-storage.com.evil.com/a.jpg",
        "https://public.blob.vercel-storage.com/playgrounds/a.jpg",
        "https://nested.abc123store.public.blob.vercel-storage.com/a.jpg",
        "https://user:pass@abc123store.public.blob.vercel-storage.com/a.jpg",
        "https://abc123store.public.blob.vercel-storage.com:8443/a.jpg",
        "https://abc123store.public.blob.vercel-storage.com/",
      ];

      for (const url of invalidUrls) {
        expect(isVercelBlobUrl(url)).toBe(false);
        expect(normalizeVercelBlobUrl(url)).toBeNull();
      }
    });

    it("should reject legacy local upload paths, external URLs, and empty strings", () => {
      expect(isVercelBlobUrl("/uploads/playgrounds/legacy.jpg")).toBe(false);
      expect(isVercelBlobUrl("https://www.oskarsson.is/photo.jpg")).toBe(false);
      expect(isVercelBlobUrl("")).toBe(false);
    });
  });

  describe("deleteOrphanedFiles", () => {
    it("should delete Vercel Blob URLs present in old list but not in new list", async () => {
      const oldUrl = `${BLOB_BASE}/playgrounds/old-image.jpg`;
      const keepUrl = `${BLOB_BASE}/playgrounds/keep-image.jpg`;

      await deleteOrphanedFiles([oldUrl, keepUrl], [keepUrl]);

      expect(mockDel).toHaveBeenCalledTimes(1);
      expect(mockDel).toHaveBeenCalledWith([oldUrl], {
        token: "store-token-123",
      });
    });

    it("should deduplicate repeated URLs and ignore query param differences", async () => {
      const oldUrl = `${BLOB_BASE}/playgrounds/old.jpg`;
      const keepUrl = `${BLOB_BASE}/playgrounds/keep.jpg`;

      await deleteOrphanedFiles(
        [oldUrl, oldUrl, `${keepUrl}?v=1`],
        [`${keepUrl}?v=2`],
      );

      expect(mockDel).toHaveBeenCalledTimes(1);
      expect(mockDel).toHaveBeenCalledWith([oldUrl], {
        token: "store-token-123",
      });
    });

    it("should not call del when all old images remain referenced", async () => {
      const images = [
        `${BLOB_BASE}/playgrounds/image1.jpg`,
        `${BLOB_BASE}/playgrounds/image2.jpg`,
      ];

      await deleteOrphanedFiles(images, images);

      expect(mockDel).not.toHaveBeenCalled();
    });

    it("should handle empty old images list (no deletions)", async () => {
      await deleteOrphanedFiles([], [`${BLOB_BASE}/playgrounds/new.jpg`]);
      expect(mockDel).not.toHaveBeenCalled();
    });

    it("should delete all valid Vercel Blob URLs when new images list is empty", async () => {
      const a = `${BLOB_BASE}/playgrounds/a.jpg`;
      const b = `${BLOB_BASE}/playgrounds/b.jpg`;

      await deleteOrphanedFiles([a, b], []);

      expect(mockDel).toHaveBeenCalledTimes(1);
      expect(mockDel).toHaveBeenCalledWith([a, b], {
        token: "store-token-123",
      });
    });

    it("should ignore non-Vercel Blob URLs such as legacy local paths or external URLs", async () => {
      const validBlob = `${BLOB_BASE}/playgrounds/blob.jpg`;

      await deleteOrphanedFiles(
        [
          "/uploads/playgrounds/legacy.jpg",
          "https://www.oskarsson.is/external.jpg",
          "https://evil.com/.public.blob.vercel-storage.com/spoof.jpg",
          validBlob,
        ],
        [],
      );

      expect(mockDel).toHaveBeenCalledTimes(1);
      expect(mockDel).toHaveBeenCalledWith([validBlob], {
        token: "store-token-123",
      });
    });

    it("should fall back to BLOB_READ_WRITE_TOKEN when store-specific token is unset", async () => {
      mockEnv.leikvellir_image_store_READ_WRITE_TOKEN = undefined;
      mockEnv.BLOB_READ_WRITE_TOKEN = "fallback-blob-token";
      const oldUrl = `${BLOB_BASE}/playgrounds/orphan.jpg`;

      await deleteOrphanedFiles([oldUrl], []);

      expect(mockDel).toHaveBeenCalledWith([oldUrl], {
        token: "fallback-blob-token",
      });
    });

    it("should skip deletion and warn when no blob token is configured", async () => {
      mockEnv.leikvellir_image_store_READ_WRITE_TOKEN = undefined;
      mockEnv.BLOB_READ_WRITE_TOKEN = undefined;

      await deleteOrphanedFiles([`${BLOB_BASE}/playgrounds/orphan.jpg`], []);

      expect(mockDel).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("missing blob storage token"),
        expect.objectContaining({ component: "FileCleanup" }),
      );
    });

    it("should log error and not throw when @vercel/blob del fails", async () => {
      mockDel.mockRejectedValueOnce(new Error("Blob API error"));
      const oldUrl = `${BLOB_BASE}/playgrounds/missing.jpg`;

      await expect(
        deleteOrphanedFiles([oldUrl], []),
      ).resolves.toBeUndefined();

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete orphaned Vercel Blob files"),
        expect.objectContaining({
          component: "FileCleanup",
          action: "delete_orphaned_files",
        }),
        expect.any(Error),
      );
    });
  });

  describe("deleteFileByUrl", () => {
    it("should delete valid Vercel Blob URL and return true", async () => {
      const url = `${BLOB_BASE}/playgrounds/file.jpg`;
      const result = await deleteFileByUrl(url);

      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith(url, { token: "store-token-123" });
    });

    it("should return false and warn for non-Vercel Blob URLs", async () => {
      const result = await deleteFileByUrl("https://example.com/no-match.jpg");

      expect(result).toBe(false);
      expect(mockDel).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalled();
    });

    it("should return false when blob token is missing", async () => {
      mockEnv.leikvellir_image_store_READ_WRITE_TOKEN = undefined;
      mockEnv.BLOB_READ_WRITE_TOKEN = undefined;

      const result = await deleteFileByUrl(`${BLOB_BASE}/playgrounds/file.jpg`);

      expect(result).toBe(false);
      expect(mockDel).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalled();
    });

    it("should return false and log error when del rejects", async () => {
      mockDel.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await deleteFileByUrl(`${BLOB_BASE}/playgrounds/file.jpg`);

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });
});
