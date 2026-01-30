// __tests__/lib/file-cleanup.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before vi.mock hoisting, so mockUnlink is available
const { mockUnlink } = vi.hoisted(() => ({
  mockUnlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("fs/promises", () => ({
  default: { unlink: mockUnlink },
  unlink: mockUnlink,
}));

vi.mock("path", () => ({
  default: { join: (...parts: string[]) => parts.join("/") },
  join: (...parts: string[]) => parts.join("/"),
}));

import {
  extractFilename,
  deleteOrphanedFiles,
  deleteFileByUrl,
} from "~/lib/file-cleanup";

describe("file-cleanup utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractFilename", () => {
    it("should extract filename from valid upload URL", () => {
      const url = "/uploads/playgrounds/test-image_123_abc.jpg";
      expect(extractFilename(url)).toBe("test-image_123_abc.jpg");
    });

    it("should return null for URL without /uploads/playgrounds/ prefix", () => {
      expect(extractFilename("/images/photo.jpg")).toBeNull();
      expect(extractFilename("https://example.com/photo.jpg")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(extractFilename("")).toBeNull();
    });

    it("should handle URLs with query parameters", () => {
      const url = "/uploads/playgrounds/image.jpg?w=300";
      expect(extractFilename(url)).toBe("image.jpg");
    });

    it("should extract filename from full URL path", () => {
      const url = "https://example.com/uploads/playgrounds/my-file.png";
      expect(extractFilename(url)).toBe("my-file.png");
    });
  });

  describe("deleteOrphanedFiles", () => {
    it("should delete files present in old list but not in new list", async () => {
      const oldImages = [
        "/uploads/playgrounds/old-image.jpg",
        "/uploads/playgrounds/keep-image.jpg",
      ];
      const newImages = ["/uploads/playgrounds/keep-image.jpg"];

      await deleteOrphanedFiles(oldImages, newImages);

      expect(mockUnlink).toHaveBeenCalledTimes(1);
      // The join mock concatenates with /
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining("old-image.jpg"),
      );
    });

    it("should not delete files present in both lists", async () => {
      const images = [
        "/uploads/playgrounds/image1.jpg",
        "/uploads/playgrounds/image2.jpg",
      ];

      await deleteOrphanedFiles(images, images);

      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("should handle empty old images list (no deletions)", async () => {
      await deleteOrphanedFiles([], ["/uploads/playgrounds/new.jpg"]);
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("should handle empty new images list (delete all)", async () => {
      const oldImages = [
        "/uploads/playgrounds/a.jpg",
        "/uploads/playgrounds/b.jpg",
      ];

      await deleteOrphanedFiles(oldImages, []);

      expect(mockUnlink).toHaveBeenCalledTimes(2);
    });

    it("should handle files that fail to delete gracefully (no throw)", async () => {
      mockUnlink.mockRejectedValueOnce(new Error("ENOENT"));

      const oldImages = ["/uploads/playgrounds/missing.jpg"];

      // Should not throw
      await expect(deleteOrphanedFiles(oldImages, [])).resolves.toBeUndefined();
    });

    it("should handle URLs that cannot have filenames extracted", async () => {
      const oldImages = ["https://example.com/no-match.jpg"];
      await deleteOrphanedFiles(oldImages, []);
      expect(mockUnlink).not.toHaveBeenCalled();
    });
  });

  describe("deleteFileByUrl", () => {
    it("should delete file by URL and return true on success", async () => {
      mockUnlink.mockResolvedValueOnce(undefined);
      const result = await deleteFileByUrl("/uploads/playgrounds/file.jpg");
      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalledTimes(1);
    });

    it("should return false when filename cannot be extracted", async () => {
      const result = await deleteFileByUrl("https://example.com/no-match.jpg");
      expect(result).toBe(false);
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("should return false when unlink fails", async () => {
      mockUnlink.mockRejectedValueOnce(new Error("Permission denied"));
      const result = await deleteFileByUrl("/uploads/playgrounds/file.jpg");
      expect(result).toBe(false);
    });
  });
});
