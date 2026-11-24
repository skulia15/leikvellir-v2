import { describe, it, expect } from "vitest";
import {
  isVercelBlobUrl,
  isAllowedRemoteImageUrl,
  isSafeLocalUploadPath,
  isAllowedImageUrl,
  MAX_PHOTOS_PER_CALL,
} from "~/lib/image-url";
import {
  AddPhotosSchema,
  CreateEditSuggestionSchema,
  CreatePlaygroundSchema,
  ReviewEditSuggestionSchema,
  ReviewPlaygroundSchema,
  UpdateMySubmissionSchema,
  UpdatePlaygroundSchema,
} from "~/types";

describe("Strict image URL validation & SSRF protection", () => {
  describe("isVercelBlobUrl", () => {
    it("accepts valid HTTPS Vercel Blob store URLs", () => {
      expect(
        isVercelBlobUrl(
          "https://abc123-store.public.blob.vercel-storage.com/playgrounds/photo.jpg",
        ),
      ).toBe(true);
      expect(
        isVercelBlobUrl(
          "https://store.public.blob.vercel-storage.com/a/b/photo.webp",
        ),
      ).toBe(true);
    });

    it("supports pinning to a specific configured store host", () => {
      const opts = {
        allowedStoreHost: "my-store.public.blob.vercel-storage.com",
      };
      expect(
        isVercelBlobUrl(
          "https://my-store.public.blob.vercel-storage.com/playgrounds/a.jpg",
          opts,
        ),
      ).toBe(true);
      expect(
        isVercelBlobUrl(
          "https://other-store.public.blob.vercel-storage.com/playgrounds/a.jpg",
          opts,
        ),
      ).toBe(false);
    });

    it.each([
      ["path substring bypass", "https://evil.com/.public.blob.vercel-storage.com/photo.jpg"],
      ["query substring bypass", "https://evil.com/photo.jpg?x=.public.blob.vercel-storage.com/"],
      ["fragment bypass", "https://evil.com/#.public.blob.vercel-storage.com/"],
      ["userinfo spoof", "https://store.public.blob.vercel-storage.com@evil.com/photo.jpg"],
      ["suffix domain spoof", "https://store.public.blob.vercel-storage.com.evil.com/photo.jpg"],
      ["nested subdomain", "https://a.b.public.blob.vercel-storage.com/photo.jpg"],
      ["missing store subdomain", "https://public.blob.vercel-storage.com/photo.jpg"],
      ["http protocol", "http://store.public.blob.vercel-storage.com/playgrounds/photo.jpg"],
      ["non-default port", "https://store.public.blob.vercel-storage.com:8443/playgrounds/photo.jpg"],
      ["embedded credentials", "https://user:pass@store.public.blob.vercel-storage.com/playgrounds/photo.jpg"],
      ["empty root path", "https://store.public.blob.vercel-storage.com/"],
      ["leading whitespace", " https://store.public.blob.vercel-storage.com/playgrounds/photo.jpg"],
      ["invalid store label leading hyphen", "https://-bad.public.blob.vercel-storage.com/photo.jpg"],
    ])("rejects %s (%s)", (_label, url) => {
      expect(isVercelBlobUrl(url)).toBe(false);
    });
  });

  describe("isAllowedRemoteImageUrl (SSRF rejection)", () => {
    it("accepts known allowlisted remote playground image hosts", () => {
      expect(
        isAllowedRemoteImageUrl("https://www.oskarsson.is/images/playground.jpg"),
      ).toBe(true);
    });

    it.each([
      ["AWS metadata IP", "http://169.254.169.254/latest/meta-data/"],
      ["IPv4 loopback", "http://127.0.0.1:8080/internal"],
      ["HTTPS loopback", "https://127.0.0.1/photo.jpg"],
      ["IPv6 loopback", "https://[::1]/photo.jpg"],
      ["localhost", "http://localhost:3000/uploads/a.jpg"],
      ["private RFC1918", "https://10.0.0.1/secret.jpg"],
      ["file scheme", "file:///etc/passwd"],
      ["javascript scheme", "javascript:alert(1)"],
      ["data URI", "data:image/svg+xml,<svg onload=alert(1)>"],
      ["unlisted external host", "https://attacker.example.com/tracker.png"],
      ["relative local path", "/uploads/playgrounds/test.jpg"],
    ])("rejects %s (%s)", (_label, url) => {
      expect(isAllowedRemoteImageUrl(url)).toBe(false);
    });
  });

  describe("isSafeLocalUploadPath & isAllowedImageUrl", () => {
    it("accepts safe local upload paths", () => {
      expect(isSafeLocalUploadPath("/uploads/playgrounds/test-image_1.jpg")).toBe(true);
      expect(isAllowedImageUrl("/uploads/playgrounds/test-image_1.jpg")).toBe(true);
    });

    it.each([
      ["path traversal", "/uploads/../etc/passwd"],
      ["nested traversal", "/uploads/playgrounds/../../secret.env"],
      ["protocol-relative URL", "//evil.com/uploads/photo.jpg"],
      ["query string", "/uploads/playgrounds/a.jpg?foo=bar"],
      ["backslash", "/uploads/playgrounds\\a.jpg"],
      ["empty string", ""],
    ])("rejects %s (%s)", (_label, path) => {
      expect(isSafeLocalUploadPath(path)).toBe(false);
      expect(isAllowedImageUrl(path)).toBe(false);
    });
  });

  describe("Zod schemas enforce strict image URL allowlist", () => {
    const validBlob = "https://store.public.blob.vercel-storage.com/playgrounds/img.jpg";
    const bypassUrl = "https://evil.com/.public.blob.vercel-storage.com/img.jpg";
    const ssrfUrl = "http://169.254.169.254/latest/meta-data/";

    const basePlayground = {
      title: "Test Playground",
      latitude: 64.071,
      longitude: -21.954,
      municipality: "Reykjavík",
      publiclyAccessible: true,
      toddlerFriendly: false,
      isSchoolGround: false,
      schoolType: null,
      hasSeating: true,
      hasPicnicTable: false,
      hasFencing: true,
      hasGarbageCan: true,
      hasBathroomNearby: false,
      hasSoftPlayArea: false,
      submitAnonymously: false,
      equipmentIds: [],
    };

    it("CreatePlaygroundSchema rejects substring bypass and SSRF URLs", () => {
      expect(
        CreatePlaygroundSchema.safeParse({ ...basePlayground, images: [validBlob] }).success,
      ).toBe(true);
      expect(
        CreatePlaygroundSchema.safeParse({ ...basePlayground, images: [bypassUrl] }).success,
      ).toBe(false);
      expect(
        CreatePlaygroundSchema.safeParse({ ...basePlayground, images: [ssrfUrl] }).success,
      ).toBe(false);
    });

    it("CreateEditSuggestionSchema rejects arbitrary coverImage and images", () => {
      expect(
        CreateEditSuggestionSchema.safeParse({
          playgroundId: 1,
          coverImage: validBlob,
          images: [validBlob],
        }).success,
      ).toBe(true);
      expect(
        CreateEditSuggestionSchema.safeParse({
          playgroundId: 1,
          coverImage: ssrfUrl,
        }).success,
      ).toBe(false);
      expect(
        CreateEditSuggestionSchema.safeParse({
          playgroundId: 1,
          images: [bypassUrl],
        }).success,
      ).toBe(false);
    });

    it("UpdatePlaygroundSchema, ReviewPlaygroundSchema, ReviewEditSuggestionSchema, and UpdateMySubmissionSchema reject arbitrary URLs", () => {
      expect(
        UpdatePlaygroundSchema.safeParse({
          ...basePlayground,
          id: 1,
          coverImage: ssrfUrl,
          images: [],
        }).success,
      ).toBe(false);
      expect(
        ReviewPlaygroundSchema.safeParse({
          id: 1,
          action: "approve",
          images: [bypassUrl],
        }).success,
      ).toBe(false);
      expect(
        ReviewEditSuggestionSchema.safeParse({
          id: 1,
          action: "approve",
          finalValues: { coverImage: ssrfUrl },
        }).success,
      ).toBe(false);
      expect(
        UpdateMySubmissionSchema.safeParse({
          ...basePlayground,
          id: 1,
          images: [bypassUrl],
        }).success,
      ).toBe(false);
    });

    it("AddPhotosSchema requires allowlisted remote HTTPS URLs and caps count", () => {
      expect(
        AddPhotosSchema.safeParse({ id: 1, images: [validBlob] }).success,
      ).toBe(true);
      expect(
        AddPhotosSchema.safeParse({ id: 1, images: ["/uploads/playgrounds/a.jpg"] }).success,
      ).toBe(false);
      expect(
        AddPhotosSchema.safeParse({ id: 1, images: [bypassUrl] }).success,
      ).toBe(false);
      expect(
        AddPhotosSchema.safeParse({
          id: 1,
          images: Array.from(
            { length: MAX_PHOTOS_PER_CALL + 1 },
            (_, i) => `https://store.public.blob.vercel-storage.com/playgrounds/img-${i}.jpg`,
          ),
        }).success,
      ).toBe(false);
    });
  });
});
