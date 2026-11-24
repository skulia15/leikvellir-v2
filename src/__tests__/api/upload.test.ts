// __tests__/api/upload.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock modules before imports
vi.mock("~/server/auth", () => ({
  getServerAuthSession: vi.fn(),
}));
vi.mock("~/server/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      playgrounds: { findFirst: vi.fn() },
      playgroundEditSuggestions: { findFirst: vi.fn() },
    },
  },
}));
vi.mock("@vercel/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vercel/blob")>();
  return {
    ...actual,
    put: vi.fn(),
    del: vi.fn(),
  };
});
vi.mock("~/lib/server-file-validation", () => ({
  validateImageFile: vi.fn(),
  sanitizeFilename: vi.fn((name: string) =>
    name.replace(/[^a-zA-Z0-9._-]/g, "_"),
  ),
  generateUniqueFilename: vi.fn(
    (name: string) => `unique_${Date.now()}_${name}`,
  ),
}));
vi.mock("~/lib/logging", () => ({
  reportUploadError: vi.fn(),
  logApiError: vi.fn(),
}));

import { POST, DELETE } from "~/app/api/upload/route";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import { put, del, BlobNotFoundError, BlobAccessError } from "@vercel/blob";
import { validateImageFile } from "~/lib/server-file-validation";
import { getUploaderPrefix } from "~/lib/blob-upload";

const mockGetSession = vi.mocked(getServerAuthSession);
const mockUsersFindFirst = vi.mocked(db.query.users.findFirst);
const mockPlaygroundsFindFirst = vi.mocked(db.query.playgrounds.findFirst);
const mockSuggestionsFindFirst = vi.mocked(
  db.query.playgroundEditSuggestions.findFirst,
);
const mockPut = vi.mocked(put);
const mockDel = vi.mocked(del);
const mockValidateImageFile = vi.mocked(validateImageFile);

const STORE_ID = "test-blob-store";

function mockSession(userId = "user-1") {
  mockGetSession.mockResolvedValue({
    user: { id: userId, name: "Test", email: "test@test.com", image: null },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

function mockDbUser(opts?: {
  id?: string;
  role?: "user" | "admin" | "super_admin";
  isBanned?: boolean;
}) {
  mockUsersFindFirst.mockResolvedValue({
    id: opts?.id ?? "user-1",
    role: opts?.role ?? "user",
    isBanned: opts?.isBanned ?? false,
  } as any);
}

function ownedBlobUrl(
  userId: string,
  filename = "test.jpg",
  storeId = STORE_ID,
): string {
  return `https://${storeId}.public.blob.vercel-storage.com/playgrounds/${getUploaderPrefix(userId)}/${filename}`;
}

// Helper to create upload request with file or arbitrary form entry
function createUploadRequest(file?: File | string): NextRequest {
  const formData = new FormData();
  if (file !== undefined) {
    formData.append("file", file);
  }
  return new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });
}

// Helper to create delete request
function createDeleteRequest(params: {
  filename?: string;
  url?: string;
}): NextRequest {
  const searchParams = new URLSearchParams();
  if (params.filename !== undefined) searchParams.set("filename", params.filename);
  if (params.url !== undefined) searchParams.set("url", params.url);
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
    process.env.BLOB_STORE_ID = STORE_ID;
    // Default DB mocks: no references found
    mockPlaygroundsFindFirst.mockResolvedValue(undefined);
    mockSuggestionsFindFirst.mockResolvedValue(undefined);
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

    it("should return 401 when session user does not exist in DB", async () => {
      mockSession("missing-user");
      mockUsersFindFirst.mockResolvedValue(undefined);
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 403 for banned user", async () => {
      mockSession("banned-user");
      mockDbUser({ id: "banned-user", role: "user", isBanned: true });
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Your account has been suspended");
      expect(mockValidateImageFile).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
    });

    it("should return 400 when no file provided", async () => {
      mockSession("post-no-file");
      mockDbUser({ id: "post-no-file" });
      const request = createUploadRequest();

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("No file provided");
    });

    it("should return 400 when file form field is a string instead of a File", async () => {
      mockSession("post-non-file");
      mockDbUser({ id: "post-non-file" });
      const request = createUploadRequest("not-a-file-string");

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid file provided");
      expect(mockValidateImageFile).not.toHaveBeenCalled();
    });

    it("should return 400 when file validation fails", async () => {
      mockSession("post-invalid-file");
      mockDbUser({ id: "post-invalid-file" });
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

    it("should upload valid file under uploader-scoped prefix and return URL", async () => {
      const userId = "post-valid-user";
      mockSession(userId);
      mockDbUser({ id: userId });
      mockValidateImageFile.mockResolvedValue({ isValid: true });

      const expectedPrefix = getUploaderPrefix(userId);
      const expectedUrl = ownedBlobUrl(userId, "test.jpg");
      mockPut.mockResolvedValue({
        url: expectedUrl,
        downloadUrl: expectedUrl,
        pathname: `playgrounds/${expectedPrefix}/test.jpg`,
        contentType: "image/jpeg",
        contentDisposition: "inline",
      } as any);

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.url).toBe(expectedUrl);
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^playgrounds/${expectedPrefix}/unique_\\d+_test\\.jpg$`),
        ),
        expect.any(File),
        expect.objectContaining({
          access: "public",
          token: "test-token",
        }),
      );
    });

    it("should return 500 when blob storage token is missing", async () => {
      delete process.env.leikvellir_image_store_READ_WRITE_TOKEN;
      mockSession("post-missing-token");
      mockDbUser({ id: "post-missing-token" });
      mockValidateImageFile.mockResolvedValue({ isValid: true });

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const request = createUploadRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain("Missing blob storage token");
    });

    it("should return 500 when Vercel Blob upload fails", async () => {
      mockSession("post-blob-fail");
      mockDbUser({ id: "post-blob-fail" });
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
      expect(mockDel).not.toHaveBeenCalled();
    });

    it("should return 401 when session user does not exist in DB", async () => {
      mockSession("missing-user");
      mockUsersFindFirst.mockResolvedValue(undefined);
      const request = createDeleteRequest({
        url: ownedBlobUrl("missing-user"),
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(mockDel).not.toHaveBeenCalled();
    });

    it("should return 403 for banned regular user", async () => {
      mockSession("banned-user");
      mockDbUser({ id: "banned-user", role: "user", isBanned: true });
      const request = createDeleteRequest({
        url: ownedBlobUrl("banned-user"),
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe("Your account has been suspended");
      expect(mockDel).not.toHaveBeenCalled();
    });

    it("should return 403 for banned admin user", async () => {
      mockSession("banned-admin");
      mockDbUser({ id: "banned-admin", role: "admin", isBanned: true });
      const request = createDeleteRequest({
        url: `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/test.jpg`,
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe("Your account has been suspended");
      expect(mockDel).not.toHaveBeenCalled();
    });

    it("should return 400 when neither filename nor URL provided", async () => {
      mockSession("user-1");
      mockDbUser({ id: "user-1" });
      const request = createDeleteRequest({});

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });

    // ── URL & hostname validation ─────────────────
    describe("URL and filename validation", () => {
      beforeEach(() => {
        mockSession("admin-1");
        mockDbUser({ id: "admin-1", role: "admin" });
      });

      it("should reject non-Vercel Blob URL", async () => {
        const request = createDeleteRequest({
          url: "https://evil.com/playgrounds/test.jpg",
        });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Invalid URL");
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject spoofed hostname in URL path", async () => {
        const request = createDeleteRequest({
          url: `https://evil.com/${STORE_ID}.public.blob.vercel-storage.com/playgrounds/test.jpg`,
        });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Invalid URL");
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject spoofed hostname in query string", async () => {
        const request = createDeleteRequest({
          url: `https://evil.com/playgrounds/test.jpg?x=${STORE_ID}.public.blob.vercel-storage.com/`,
        });

        const response = await DELETE(request);
        expect(response.status).toBe(400);
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject non-HTTPS protocol", async () => {
        const request = createDeleteRequest({
          url: `http://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/test.jpg`,
        });

        const response = await DELETE(request);
        expect(response.status).toBe(400);
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject multi-level subdomain spoofing", async () => {
        const request = createDeleteRequest({
          url: `https://evil.${STORE_ID}.public.blob.vercel-storage.com/playgrounds/test.jpg`,
        });

        const response = await DELETE(request);
        expect(response.status).toBe(400);
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject URL from a different store when BLOB_STORE_ID is configured", async () => {
        const request = createDeleteRequest({
          url: "https://other-store.public.blob.vercel-storage.com/playgrounds/test.jpg",
        });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe("Invalid URL");
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should allow valid single-label store hostname when BLOB_STORE_ID is unset", async () => {
        delete process.env.BLOB_STORE_ID;
        mockDel.mockResolvedValue(undefined as any);
        const blobUrl =
          "https://any-store.public.blob.vercel-storage.com/playgrounds/test.jpg";
        const request = createDeleteRequest({ url: blobUrl });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockDel).toHaveBeenCalledWith(blobUrl, expect.any(Object));
      });

      it("should reject URL with query string or hash", async () => {
        const withQuery = createDeleteRequest({
          url: `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/test.jpg?v=1`,
        });
        const withHash = createDeleteRequest({
          url: `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/test.jpg#frag`,
        });

        expect((await DELETE(withQuery)).status).toBe(400);
        expect((await DELETE(withHash)).status).toBe(400);
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject URL outside /playgrounds/ or with path traversal", async () => {
        const outsidePath = createDeleteRequest({
          url: `https://${STORE_ID}.public.blob.vercel-storage.com/private/secret.jpg`,
        });
        const traversal = createDeleteRequest({
          url: `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/../private/secret.jpg`,
        });
        const encodedTraversal = createDeleteRequest({
          url: `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/%2e%2e/secret.jpg`,
        });

        expect((await DELETE(outsidePath)).status).toBe(400);
        expect((await DELETE(traversal)).status).toBe(400);
        expect((await DELETE(encodedTraversal)).status).toBe(400);
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject filename with invalid characters or dot-dot traversal", async () => {
        const slashReq = createDeleteRequest({ filename: "../../../etc/passwd" });
        const dotDotReq = createDeleteRequest({ filename: ".." });

        const slashRes = await DELETE(slashReq);
        const dotDotRes = await DELETE(dotDotReq);

        expect(slashRes.status).toBe(400);
        expect((await slashRes.json()).error).toBe("Invalid filename");
        expect(dotDotRes.status).toBe(400);
        expect((await dotDotRes.json()).error).toBe("Invalid filename");
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should return 500 when BLOB_STORE_ID env var missing in filename mode", async () => {
        delete process.env.BLOB_STORE_ID;
        const request = createDeleteRequest({ filename: "test.jpg" });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toContain("Server configuration error");
        expect(mockDel).not.toHaveBeenCalled();
      });
    });

    // ── IDOR prevention & authorization ───────────
    describe("IDOR prevention and authorization", () => {
      it("should reject regular user attempting to delete a legacy playground image", async () => {
        mockSession("attacker-1");
        mockDbUser({ id: "attacker-1", role: "user" });

        const legacyUrl = `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/existing-playground.jpg`;
        const request = createDeleteRequest({ url: legacyUrl });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Forbidden");
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject regular user attempting to delete another user's uploaded blob", async () => {
        mockSession("attacker-1");
        mockDbUser({ id: "attacker-1", role: "user" });

        const victimUrl = ownedBlobUrl("victim-2", "photo.jpg");
        const request = createDeleteRequest({ url: victimUrl });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Forbidden");
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject regular user attempting to delete their own blob referenced by an existing playground", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockPlaygroundsFindFirst.mockResolvedValue({ id: 42 } as any);

        const ownUrl = ownedBlobUrl("user-1", "submitted-photo.jpg");
        const request = createDeleteRequest({ url: ownUrl });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Forbidden");
        expect(mockPlaygroundsFindFirst).toHaveBeenCalledTimes(1);
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should reject regular user attempting to delete their own blob referenced by another user's edit suggestion", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockPlaygroundsFindFirst.mockResolvedValue(undefined);
        mockSuggestionsFindFirst.mockResolvedValue({ id: 99 } as any);

        const ownUrl = ownedBlobUrl("user-1", "suggested-photo.jpg");
        const request = createDeleteRequest({ url: ownUrl });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Forbidden");
        expect(mockSuggestionsFindFirst).toHaveBeenCalledTimes(1);
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should canonicalize percent-encoded paths before checking DB references", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockPlaygroundsFindFirst.mockResolvedValue(undefined);
        mockSuggestionsFindFirst.mockResolvedValue(undefined);
        mockDel.mockResolvedValue(undefined as any);

        const encodedUrl = `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/${getUploaderPrefix("user-1")}/%74est.jpg`;
        const canonicalUrl = ownedBlobUrl("user-1", "test.jpg");
        const request = createDeleteRequest({ url: encodedUrl });

        const response = await DELETE(request);
        expect(response.status).toBe(200);
        expect(mockDel).toHaveBeenCalledWith(canonicalUrl, expect.any(Object));
      });

      it("should allow regular user to delete their own unreferenced blob by URL", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockDel.mockResolvedValue(undefined as any);

        const blobUrl = ownedBlobUrl("user-1", "just-uploaded.jpg");
        const request = createDeleteRequest({ url: blobUrl });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockDel).toHaveBeenCalledWith(blobUrl, { token: "test-token" });
      });

      it("should scope regular user filename deletion to their own uploader prefix", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockDel.mockResolvedValue(undefined as any);

        const request = createDeleteRequest({ filename: "test-image.jpg" });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockDel).toHaveBeenCalledWith(
          ownedBlobUrl("user-1", "test-image.jpg"),
          { token: "test-token" },
        );
      });

      it("should allow admin to delete any validated playground blob (legacy or another user's)", async () => {
        mockSession("admin-1");
        mockDbUser({ id: "admin-1", role: "admin" });
        mockDel.mockResolvedValue(undefined as any);

        const legacyUrl = `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/legacy.jpg`;
        const otherUserUrl = ownedBlobUrl("other-user", "photo.jpg");

        const res1 = await DELETE(createDeleteRequest({ url: legacyUrl }));
        const res2 = await DELETE(createDeleteRequest({ url: otherUserUrl }));

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(mockDel).toHaveBeenCalledWith(legacyUrl, { token: "test-token" });
        expect(mockDel).toHaveBeenCalledWith(otherUserUrl, {
          token: "test-token",
        });
      });

      it("should allow super_admin to delete any validated playground blob", async () => {
        mockSession("super-1");
        mockDbUser({ id: "super-1", role: "super_admin" });
        mockDel.mockResolvedValue(undefined as any);

        const legacyUrl = `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/legacy.jpg`;
        const response = await DELETE(createDeleteRequest({ url: legacyUrl }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockDel).toHaveBeenCalledWith(legacyUrl, { token: "test-token" });
      });

      it("should allow admin to delete legacy blob by filename", async () => {
        mockSession("admin-1");
        mockDbUser({ id: "admin-1", role: "admin" });
        mockDel.mockResolvedValue(undefined as any);

        const response = await DELETE(
          createDeleteRequest({ filename: "test-image.jpg" }),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockDel).toHaveBeenCalledWith(
          `https://${STORE_ID}.public.blob.vercel-storage.com/playgrounds/test-image.jpg`,
          { token: "test-token" },
        );
      });
    });

    // ── Error handling ────────────────────────────
    describe("error handling", () => {
      it("should return 500 when blob storage token is missing on DELETE", async () => {
        delete process.env.leikvellir_image_store_READ_WRITE_TOKEN;
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });

        const request = createDeleteRequest({
          url: ownedBlobUrl("user-1", "test.jpg"),
        });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.success).toBe(false);
        expect(body.error).toContain("Missing blob storage token");
        expect(mockDel).not.toHaveBeenCalled();
      });

      it("should return 500 when del() fails with auth error instead of swallowing as 200", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockDel.mockRejectedValue(new BlobAccessError());

        const request = createDeleteRequest({
          url: ownedBlobUrl("user-1", "test.jpg"),
        });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.success).toBe(false);
        expect(body.error).toBe("Failed to delete file");
      });

      it("should return 500 when del() fails with server/network error instead of swallowing as 200", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockDel.mockRejectedValue(new Error("Blob service unavailable"));

        const request = createDeleteRequest({
          url: ownedBlobUrl("user-1", "test.jpg"),
        });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.success).toBe(false);
        expect(body.error).toBe("Failed to delete file");
      });

      it("should treat BlobNotFoundError as idempotent 200 success", async () => {
        mockSession("user-1");
        mockDbUser({ id: "user-1", role: "user" });
        mockDel.mockRejectedValue(new BlobNotFoundError());

        const request = createDeleteRequest({
          url: ownedBlobUrl("user-1", "already-gone.jpg"),
        });

        const response = await DELETE(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
      });
    });
  });
});
