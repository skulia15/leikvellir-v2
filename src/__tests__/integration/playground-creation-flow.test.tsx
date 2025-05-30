// __tests__/integration/playground-creation-flow.test.tsx
import { beforeEach, describe, it, vi } from "vitest";
import { createMockSession } from "~/test/test-utils";

// Mock authentication
vi.mock("~/server/auth", () => ({
  getServerAuthSession: vi.fn(),
}));

// Mock file validation
vi.mock("~/lib/file-validation", () => ({
  validateMultipleFiles: vi.fn(),
  formatFileSize: vi.fn((size) => `${(size / 1024).toFixed(1)} KB`),
}));

import { validateMultipleFiles } from "~/lib/file-validation";
import { getServerAuthSession } from "~/server/auth";

const mockGetServerAuthSession = vi.mocked(getServerAuthSession);
const mockValidateMultipleFiles = vi.mocked(validateMultipleFiles);

describe.skip("Playground Creation Flow", () => {
  // Skipping integration tests for now as they require complex tRPC mocking
  // These tests would need proper MSW handlers for tRPC endpoints

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerAuthSession.mockResolvedValue(createMockSession());
    mockValidateMultipleFiles.mockResolvedValue({
      valid: [],
      invalid: [],
    });
  });

  it.skip("should complete full playground creation workflow", async () => {
    // Test implementation skipped
  });

  it.skip("should handle validation errors gracefully", async () => {
    // Test implementation skipped
  });

  it.skip("should handle file upload errors", async () => {
    // Test implementation skipped
  });
});
