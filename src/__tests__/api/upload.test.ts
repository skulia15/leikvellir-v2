// __tests__/api/upload.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock modules before imports
vi.mock("~/server/auth", () => ({
  getServerAuthSession: vi.fn(),
}));
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}));
vi.mock("~/lib/server-file-validation", () => ({
  validateImageFile: vi.fn(),
  sanitizeFilename: vi.fn((name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_")),
  generateUniqueFilename: vi.fn((name: string) => `unique_${Date.now()}_${name}`),
}));
vi.mock("~/lib/logging", () => ({
  reportUploadError: vi.fn(),
  logApiError: vi.fn(),
}));

import { POST, DELETE } from "~/app/api/upload/route";
import { getServerAuthSession } from "~/server/auth";
import { put, del } from "@vercel/blob";
import { validateImageFile } from "~/lib/server-file-validation";

const mockGetSession = vi.mocked(getServerAuthSession);
const mockPut = vi.mocked(put);
const mockDel = vi.mocked(del);
const mockValidateImageFile = vi.mocked(validateImageFile);

// Helper to create upload request with file
function createUploadRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  return new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });
}

// Helper to create delete request
function createDeleteRequest(params: { filename?: string; url?: string }): NextRequest {
  const searchParams = new URLSearchParams();
  if (params.filename) searchParams.set("filename", params.filename);
  if (params.url) searchParams.set("url", params.url);
  return new NextRequest(
    `http://localhost:3000/api/upload?${searchParams.toString()}`,
    { method: "DELETE" },
  );
}

describe("Upload API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    process.env.leikvellir_image_store_READ_WRITE_TOKEN = "test-token";
    process.env.BLOB_STORE_ID = "test-blob-store";
  });

  // ── POST (upload) ───────────────────────────────
  describe("POST", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockGetSession.mockResolvedValue(null);
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when no file provided", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const request = createUploadRequest(); // no file

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("No file provided");
    });

    it("should return 400 when file validation fails", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockValidateImageFile.mockResolvedValue({
        isValid: false,
        error: "File too large",
      });
      const file = new File(["content"], "big.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("File too large");
    });

    it("should upload valid file to Vercel Blob and return URL", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockValidateImageFile.mockResolvedValue({ isValid: true });
      mockPut.mockResolvedValue({
        url: "https://store.public.blob.vercel-storage.com/playgrounds/test.jpg",
        downloadUrl: "https://store.public.blob.vercel-storage.com/playgrounds/test.jpg",
        pathname: "playgrounds/test.jpg",
        contentType: "image/jpeg",
        contentDisposition: "inline",
      } as any);

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.url).toBeDefined();
    });

    it("should return 500 when blob storage token is missing", async () => {
      delete process.env.leikvellir_image_store_READ_WRITE_TOKEN;
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockValidateImageFile.mockResolvedValue({ isValid: true });

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain("Missing blob storage token");
    });

    it("should return 500 when Vercel Blob upload fails", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockValidateImageFile.mockResolvedValue({ isValid: true });
      mockPut.mockRejectedValue(new Error("Blob storage unavailable"));

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain("File upload failed");
    });
  });

  // ── DELETE (cleanup) ────────────────────────────
  describe("DELETE", () => {
    it("should return 401 for unauthenticated request", async () => {
      mockGetSession.mockResolvedValue(null);
      const request = createDeleteRequest({ filename: "test.jpg" });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when neither filename nor URL provided", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      const request = createDeleteRequest({});

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
    });

    it("should delete by full blob URL", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockDel.mockResolvedValue(undefined as any);

      const blobUrl =
        "https://store.public.blob.vercel-storage.com/playgrounds/test.jpg";
      const request = createDeleteRequest({ url: blobUrl });

      const response = await DELETE(request);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(mockDel).toHaveBeenCalledWith(blobUrl, expect.any(Object));
    });

    it("should reject invalid URL (not from vercel blob storage)", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const request = createDeleteRequest({
        url: "https://evil.com/playgrounds/test.jpg",
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid URL");
    });

    it("should delete by filename", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockDel.mockResolvedValue(undefined as any);

      const request = createDeleteRequest({ filename: "test-image.jpg" });

      const response = await DELETE(request);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(mockDel).toHaveBeenCalled();
    });

    it("should reject filename with invalid characters", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const request = createDeleteRequest({
        filename: "../../../etc/passwd",
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Invalid filename");
    });

    it("should return 500 when BLOB_STORE_ID env var missing (filename mode)", async () => {
      delete process.env.BLOB_STORE_ID;
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const request = createDeleteRequest({ filename: "test.jpg" });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain("Server configuration error");
    });

    it("should return success even if blob delete fails (graceful)", async () => {
      mockGetSession.mockResolvedValue({
        user: { id: "user-1", name: "Test", email: "test@test.com", image: null },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockDel.mockRejectedValue(new Error("Not found"));

      const blobUrl =
        "https://store.public.blob.vercel-storage.com/playgrounds/test.jpg";
      const request = createDeleteRequest({ url: blobUrl });

      const response = await DELETE(request);
      const body = await response.json();

      // Should still succeed - file might not exist
      expect(body.success).toBe(true);
    });
  });
});
