// __tests__/lib/file-validation.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateImageFile,
  validateMultipleFiles,
  formatFileSize,
  sanitizeFilename,
  generateUniqueFilename,
} from "~/lib/client-file-validation";
import { createMockFile, createMockImageFile } from "~/test/test-utils";
import { DEFAULT_UPLOAD_CONFIG } from "~/types/upload";

// Mock the isBrowser function to return true in tests
vi.mock("~/lib/utils", () => ({
  isBrowser: vi.fn(() => true),
  cn: vi.fn((...args) => args.filter(Boolean).join(" ")),
}));

interface MockFileReaderEvent {
  target: { result: ArrayBuffer | null };
}

interface MockFileReaderInstance {
  onload: ((event: MockFileReaderEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  result: ArrayBuffer | null;
  readAsArrayBuffer: (file: Blob) => void;
}

describe("File Validation", () => {
  // Set up FileReader mock for each test
  beforeEach(() => {
    // Create a proper FileReader mock
    const MockFileReader = function (this: MockFileReaderInstance) {
      this.onload = null;
      this.onerror = null;
      this.result = null;

      this.readAsArrayBuffer = (file: Blob) => {
        // Determine the correct signature based on file type
        const signatures: Record<string, number[]> = {
          "image/jpeg": [0xff, 0xd8, 0xff],
          "image/png": [0x89, 0x50, 0x4e, 0x47],
          "image/webp": [0x52, 0x49, 0x46, 0x46],
          "text/plain": [0x48, 0x65, 0x6c, 0x6c], // Not an image signature
        };

        const signature = signatures[file.type] ?? [0x00, 0x00, 0x00];
        const buffer = new ArrayBuffer(12);
        const view = new Uint8Array(buffer);

        signature.forEach((byte, index) => {
          view[index] = byte;
        });

        this.result = buffer;

        // Call onload synchronously for predictable tests
        if (this.onload) {
          this.onload({ target: { result: buffer } });
        }
      };
    } as unknown as new () => MockFileReaderInstance;

    // Override FileReader globally for this test
    (global as unknown as Record<string, unknown>).FileReader = MockFileReader;
    (window as unknown as Record<string, unknown>).FileReader = MockFileReader;
  });
  describe("validateImageFile", () => {
    it("should accept valid JPEG images", async () => {
      const file = createMockImageFile("photo.jpg", 1024 * 500, "image/jpeg");

      const result = await validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid PNG images", async () => {
      const file = createMockImageFile("photo.png", 1024 * 500, "image/png");

      const result = await validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid WebP images", async () => {
      const file = createMockImageFile("photo.webp", 1024 * 500, "image/webp");

      const result = await validateImageFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject files that are too large", async () => {
      const largeFile = createMockImageFile(
        "huge-photo.jpg",
        DEFAULT_UPLOAD_CONFIG.maxSize + 1, // Exceed size limit
        "image/jpeg",
      );

      const result = await validateImageFile(largeFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("File too large");
    });

    it("should reject empty files", async () => {
      const emptyFile = createMockImageFile("empty.jpg", 0, "image/jpeg");

      const result = await validateImageFile(emptyFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("File is empty");
    });

    it("should reject non-image file types", async () => {
      const textFile = createMockFile("document.txt", 1024, "text/plain");

      const result = await validateImageFile(textFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject files with invalid signatures (security test)", async () => {
      // Create a file that claims to be JPEG but has wrong signature
      const fakeImageFile = createMockFile("fake.jpg", 1024, "text/plain");

      const result = await validateImageFile(fakeImageFile);

      expect(result.isValid).toBe(false);
      // This should fail at MIME type check, which happens before signature check
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject files with correct MIME type but invalid signature", async () => {
      // Create a mock that will fail signature validation
      const file = createMockImageFile("test.jpg", 1024, "image/jpeg");

      // Temporarily override the global FileReader mock for this test
      const OriginalMockFileReader = (
        global as unknown as Record<string, unknown>
      ).FileReader;

      const InvalidSignatureMockFileReader = function (
        this: MockFileReaderInstance,
      ) {
        this.onload = null;
        this.onerror = null;
        this.result = null;

        this.readAsArrayBuffer = (_file: Blob) => {
          // Always return invalid signature regardless of file type
          const buffer = new ArrayBuffer(12);
          const view = new Uint8Array(buffer);
          view[0] = 0x00; // Wrong signature - should be 0xFF for JPEG
          view[1] = 0x00; // Wrong signature - should be 0xD8 for JPEG
          view[2] = 0x00; // Wrong signature - should be 0xFF for JPEG

          this.result = buffer;

          // Call onload synchronously for predictable tests
          if (this.onload) {
            this.onload({ target: { result: buffer } });
          }
        };
      } as unknown as new () => MockFileReaderInstance;

      // Override FileReader for this test
      (global as unknown as Record<string, unknown>).FileReader =
        InvalidSignatureMockFileReader;
      (window as unknown as Record<string, unknown>).FileReader =
        InvalidSignatureMockFileReader;

      const result = await validateImageFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid file format or corrupted file");

      // Restore original mock
      (global as unknown as Record<string, unknown>).FileReader =
        OriginalMockFileReader;
      (window as unknown as Record<string, unknown>).FileReader =
        OriginalMockFileReader;
    });

    it("should validate against custom config", async () => {
      const customConfig = {
        maxSize: 1024, // Very small limit
        allowedTypes: ["image/png"], // Only PNG allowed
        maxFiles: 1,
        accept: "image/png",
      };

      // Test size limit
      const largePng = createMockImageFile("large.png", 2048, "image/png");
      const sizeResult = await validateImageFile(largePng, customConfig);
      expect(sizeResult.isValid).toBe(false);
      expect(sizeResult.error).toContain("File too large");

      // Test type restriction
      const jpeg = createMockImageFile("photo.jpg", 512, "image/jpeg");
      const typeResult = await validateImageFile(jpeg, customConfig);
      expect(typeResult.isValid).toBe(false);
      expect(typeResult.error).toContain("Invalid file type");
    });
  });

  describe("validateMultipleFiles", () => {
    it("should validate multiple valid files", async () => {
      const files = [
        createMockImageFile("photo1.jpg", 1024, "image/jpeg"),
        createMockImageFile("photo2.png", 2048, "image/png"),
        createMockImageFile("photo3.webp", 1536, "image/webp"),
      ];

      const result = await validateMultipleFiles(files);

      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });

    it("should separate valid and invalid files", async () => {
      const files = [
        createMockImageFile("valid.jpg", 1024, "image/jpeg"),
        createMockFile("invalid.txt", 1024, "text/plain"), // Invalid type
        createMockImageFile(
          "too-big.jpg",
          DEFAULT_UPLOAD_CONFIG.maxSize + 1,
          "image/jpeg",
        ), // Too big
      ];

      const result = await validateMultipleFiles(files);

      expect(result.valid).toHaveLength(1);
      expect(result.valid[0]?.name).toBe("valid.jpg");
      expect(result.invalid).toHaveLength(2);
      expect(result.invalid[0]?.file.name).toBe("invalid.txt");
      expect(result.invalid[1]?.file.name).toBe("too-big.jpg");
    });

    it("should reject if too many files", async () => {
      const files = Array.from(
        { length: DEFAULT_UPLOAD_CONFIG.maxFiles + 1 },
        (_, i) => createMockImageFile(`photo${i}.jpg`, 1024, "image/jpeg"),
      );

      await expect(validateMultipleFiles(files)).rejects.toThrow(
        `Too many files. Maximum allowed: ${DEFAULT_UPLOAD_CONFIG.maxFiles}`,
      );
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
    });

    it("should handle decimal values", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.5 MB");
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove dangerous characters", () => {
      // The client validation logic: .replace(/[/\\?%*:|"<>]/g, '_')
      // So ../../../etc/passwd becomes _._._.etc_passwd (/ becomes _)
      expect(sanitizeFilename("../../../etc/passwd")).toBe("_._._.etc_passwd");
      expect(sanitizeFilename("file with spaces.jpg")).toBe(
        "file with spaces.jpg",
      ); // spaces are allowed
      expect(sanitizeFilename('file<>:"|*.jpg')).toBe("file______.jpg"); // <> :"| * become _
    });

    it("should preserve valid characters", () => {
      expect(sanitizeFilename("valid-file_name.123.jpg")).toBe(
        "valid-file_name.123.jpg",
      );
    });

    it("should limit filename length", () => {
      const longName = "a".repeat(150) + ".jpg";
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it("should remove leading dots", () => {
      expect(sanitizeFilename(".hidden-file.jpg")).toBe("hidden-file.jpg");
    });
  });

  describe("generateUniqueFilename", () => {
    it("should generate unique filenames", () => {
      const original = "photo.jpg";
      const unique1 = generateUniqueFilename(original);
      const unique2 = generateUniqueFilename(original);

      expect(unique1).not.toBe(unique2);
      expect(unique1).toContain("photo");
      expect(unique1).toContain(".jpg");
      expect(unique2).toContain("photo");
      expect(unique2).toContain(".jpg");
    });

    it("should preserve file extension", () => {
      expect(generateUniqueFilename("test.png")).toMatch(/\.png$/);
      expect(generateUniqueFilename("test.webp")).toMatch(/\.webp$/);
    });

    it("should sanitize the base filename", () => {
      const result = generateUniqueFilename("../dangerous file.jpg");
      // The sanitized part should be _.dangerous file (/ becomes _, spaces allowed)
      expect(result).toContain("_.dangerous file");
      expect(result).toMatch(/\.jpg$/);
    });
  });
});
