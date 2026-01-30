// __tests__/lib/server-file-validation.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  formatFileSize,
  sanitizeFilename,
  generateUniqueFilename,
  validateImageFile,
  validateMultipleFiles,
} from "~/lib/server-file-validation";
import { DEFAULT_UPLOAD_CONFIG } from "~/types/upload";

// Mock isServer to return true so validation runs
vi.mock("~/lib/utils", () => ({
  isServer: () => true,
  cn: vi.fn((...args: unknown[]) =>
    args.filter(Boolean).join(" "),
  ),
}));

// Magic byte signatures for creating test files
const SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
  invalid: [0x00, 0x00, 0x00, 0x00],
};

/**
 * Create a File with specific magic bytes in its buffer.
 * This is critical for testing server-side signature validation
 * which reads file.arrayBuffer() and checks the first bytes.
 *
 * Note: jsdom's File/Blob does not implement arrayBuffer().
 * We polyfill it so the server-side validation code works.
 */
function createServerFile(
  name: string,
  size: number,
  type: string,
  signature: number[],
): File {
  const rawBuffer = new Uint8Array(Math.max(size, signature.length + 8));
  signature.forEach((byte, i) => {
    rawBuffer[i] = byte;
  });
  const blob = new Blob([rawBuffer], { type });
  const file = new File([blob], name, { type });
  // Override size to exact value for size limit tests
  Object.defineProperty(file, "size", { value: size, writable: false });
  // Polyfill arrayBuffer() for jsdom which doesn't implement it on File/Blob
  if (typeof file.arrayBuffer !== "function") {
    (file as any).arrayBuffer = () =>
      Promise.resolve(rawBuffer.buffer.slice(0, rawBuffer.byteLength));
  }
  return file;
}

describe("server-file-validation utilities", () => {
  describe("formatFileSize", () => {
    it("should format 0 bytes", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
    });

    it("should format KB values", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format MB values", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
    });

    it("should format GB values", () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
    });

    it("should handle decimal values correctly", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.5 MB");
    });
  });

  describe("sanitizeFilename", () => {
    it("should replace path traversal characters with underscore", () => {
      const result = sanitizeFilename("../../etc/passwd");
      expect(result).not.toContain("/");
      expect(result).not.toContain("\\");
    });

    it("should replace special characters (? % * : | < >) with underscore", () => {
      const result = sanitizeFilename('file<>:"|*?.jpg');
      expect(result).not.toMatch(/[<>:"|*?]/);
    });

    it("should collapse multiple consecutive dots", () => {
      expect(sanitizeFilename("file...name.jpg")).toBe("file.name.jpg");
    });

    it("should remove leading dots", () => {
      expect(sanitizeFilename(".hidden.jpg")).toBe("hidden.jpg");
    });

    it("should trim whitespace", () => {
      expect(sanitizeFilename("  file.jpg  ")).toBe("file.jpg");
    });

    it("should limit filename to 100 characters", () => {
      const longName = "a".repeat(150) + ".jpg";
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it("should preserve valid characters including spaces, hyphens, underscores", () => {
      expect(sanitizeFilename("my-file_name (1).jpg")).toBe(
        "my-file_name (1).jpg",
      );
    });
  });

  describe("generateUniqueFilename", () => {
    it("should include sanitized base name", () => {
      const result = generateUniqueFilename("photo.jpg");
      expect(result).toContain("photo");
    });

    it("should include timestamp and random suffix", () => {
      const result = generateUniqueFilename("test.jpg");
      // Format: sanitizedName_timestamp_random.ext
      const parts = result.split("_");
      expect(parts.length).toBeGreaterThanOrEqual(3);
    });

    it("should preserve file extension", () => {
      expect(generateUniqueFilename("test.png")).toMatch(/\.png$/);
      expect(generateUniqueFilename("test.webp")).toMatch(/\.webp$/);
      expect(generateUniqueFilename("test.jpg")).toMatch(/\.jpg$/);
    });

    it("should generate different names for same input on successive calls", () => {
      const name1 = generateUniqueFilename("photo.jpg");
      const name2 = generateUniqueFilename("photo.jpg");
      expect(name1).not.toBe(name2);
    });
  });

  describe("validateImageFile", () => {
    it("should accept valid JPEG file with correct signature", async () => {
      const file = createServerFile("photo.jpg", 100 * 1024, "image/jpeg", SIGNATURES.jpeg);
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid PNG file with correct signature", async () => {
      const file = createServerFile("photo.png", 100 * 1024, "image/png", SIGNATURES.png);
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it("should accept valid WebP file with correct signature", async () => {
      const file = createServerFile("photo.webp", 100 * 1024, "image/webp", SIGNATURES.webp);
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it("should reject file exceeding max size", async () => {
      const file = createServerFile(
        "huge.jpg",
        DEFAULT_UPLOAD_CONFIG.maxSize + 1,
        "image/jpeg",
        SIGNATURES.jpeg,
      );
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("File too large");
    });

    it("should reject empty file (size 0)", async () => {
      const file = createServerFile("empty.jpg", 0, "image/jpeg", SIGNATURES.jpeg);
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("File is empty");
    });

    it("should reject disallowed MIME types", async () => {
      const file = createServerFile("doc.txt", 1024, "text/plain", SIGNATURES.invalid);
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject file with valid MIME but invalid signature (security)", async () => {
      // Claims to be JPEG but has wrong magic bytes
      const file = createServerFile("fake.jpg", 1024, "image/jpeg", SIGNATURES.invalid);
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid file format");
    });

    it("should use default config when none provided", async () => {
      const file = createServerFile("photo.jpg", 100 * 1024, "image/jpeg", SIGNATURES.jpeg);
      const result = await validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it("should respect custom config maxSize", async () => {
      const customConfig = {
        maxSize: 512,
        allowedTypes: ["image/jpeg"],
        maxFiles: 10,
        accept: "image/jpeg",
      };
      const file = createServerFile("photo.jpg", 1024, "image/jpeg", SIGNATURES.jpeg);
      const result = await validateImageFile(file, customConfig);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("File too large");
    });

    it("should respect custom config allowedTypes", async () => {
      const customConfig = {
        maxSize: 4 * 1024 * 1024,
        allowedTypes: ["image/png"],
        maxFiles: 10,
        accept: "image/png",
      };
      const file = createServerFile("photo.jpg", 1024, "image/jpeg", SIGNATURES.jpeg);
      const result = await validateImageFile(file, customConfig);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });
  });

  describe("validateMultipleFiles", () => {
    it("should separate valid and invalid files", async () => {
      const files = [
        createServerFile("good.jpg", 1024, "image/jpeg", SIGNATURES.jpeg),
        createServerFile("bad.txt", 1024, "text/plain", SIGNATURES.invalid),
      ];
      const result = await validateMultipleFiles(files);
      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.valid[0]?.name).toBe("good.jpg");
      expect(result.invalid[0]?.file.name).toBe("bad.txt");
    });

    it("should throw when file count exceeds maxFiles", async () => {
      const files = Array.from({ length: DEFAULT_UPLOAD_CONFIG.maxFiles + 1 }, (_, i) =>
        createServerFile(`photo${i}.jpg`, 1024, "image/jpeg", SIGNATURES.jpeg),
      );
      await expect(validateMultipleFiles(files)).rejects.toThrow(
        `Too many files. Maximum allowed: ${DEFAULT_UPLOAD_CONFIG.maxFiles}`,
      );
    });

    it("should return all valid when all files pass", async () => {
      const files = [
        createServerFile("a.jpg", 1024, "image/jpeg", SIGNATURES.jpeg),
        createServerFile("b.png", 1024, "image/png", SIGNATURES.png),
      ];
      const result = await validateMultipleFiles(files);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
    });

    it("should return all invalid when all files fail", async () => {
      const files = [
        createServerFile("a.txt", 1024, "text/plain", SIGNATURES.invalid),
        createServerFile("b.txt", 1024, "text/plain", SIGNATURES.invalid),
      ];
      const result = await validateMultipleFiles(files);
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(2);
    });
  });
});
