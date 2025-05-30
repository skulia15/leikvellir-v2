// debug-validation.test.ts
import { describe, it, expect, vi } from "vitest";
import { validateImageFile } from "~/lib/client-file-validation";
import { createMockImageFile } from "~/test/test-utils";

// Mock the isBrowser function to return true in tests
vi.mock("~/lib/utils", () => ({
  isBrowser: vi.fn(() => true),
  cn: vi.fn((...args) => args.filter(Boolean).join(" ")),
}));

describe("Debug File Validation", () => {
  it("should debug what happens during validation", async () => {
    console.log("=== Starting debug test ===");

    const file = createMockImageFile("test.jpg", 1024, "image/jpeg");
    console.log("Created file:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Test FileReader directly
    console.log("Testing FileReader mock...");
    const reader = new FileReader();

    reader.onload = (e) => {
      console.log("FileReader onload called!");
      const arrayBuffer = e.target?.result as ArrayBuffer;
      console.log("ArrayBuffer:", arrayBuffer);
      if (arrayBuffer) {
        const uint8Array = new Uint8Array(arrayBuffer);
        console.log("First 8 bytes:", Array.from(uint8Array.slice(0, 8)));
      }
    };

    reader.readAsArrayBuffer(file);

    // Test validation
    console.log("Testing validation...");
    try {
      const result = await validateImageFile(file);
      console.log("Validation result:", result);
      expect(result.isValid).toBe(true);
    } catch (error) {
      console.error("Validation error:", error);
      throw error;
    }
  });
});
