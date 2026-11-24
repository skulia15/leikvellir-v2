// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockToBuffer, mockJpeg, mockResize, mockSharp } = vi.hoisted(() => {
  const mockToBuffer = vi.fn();
  const mockJpeg = vi.fn(() => ({ toBuffer: mockToBuffer }));
  const mockResize = vi.fn(() => ({ jpeg: mockJpeg }));
  const mockSharp = vi.fn(() => ({ resize: mockResize }));
  return { mockToBuffer, mockJpeg, mockResize, mockSharp };
});

vi.mock("sharp", () => ({
  default: mockSharp,
}));

vi.mock("~/lib/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  generateBlurDataURL,
  buildBlurDataMap,
  MAX_BLUR_SOURCE_BYTES,
} from "~/lib/image-blur";

describe("image-blur SSRF & OOM DoS protections", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    mockToBuffer.mockResolvedValue(Buffer.from("tiny-jpeg"));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("generateBlurDataURL", () => {
    it.each([
      ["AWS metadata IP", "http://169.254.169.254/latest/meta-data/"],
      ["loopback IP", "http://127.0.0.1:8080/internal"],
      ["arbitrary external host", "https://attacker.example.com/huge.jpg"],
      [
        "path substring bypass",
        "https://evil.com/.public.blob.vercel-storage.com/photo.jpg",
      ],
      ["HTTP Vercel Blob", "http://store.public.blob.vercel-storage.com/photo.jpg"],
      ["relative path", "/uploads/playgrounds/photo.jpg"],
    ])("rejects %s without invoking fetch", async (_label, url) => {
      const result = await generateBlurDataURL(url);

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockSharp).not.toHaveBeenCalled();
    });

    it("fetches allowlisted URL with timeout signal and redirect: error", async () => {
      const url =
        "https://store.public.blob.vercel-storage.com/playgrounds/photo.jpg";
      const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      fetchMock.mockResolvedValue(
        new Response(imageBytes, {
          status: 200,
          headers: { "content-length": String(imageBytes.byteLength) },
        }),
      );

      const result = await generateBlurDataURL(url);

      expect(result).toBe(
        `data:image/jpeg;base64,${Buffer.from("tiny-jpeg").toString("base64")}`,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(calledUrl).toBe(url);
      expect(init.redirect).toBe("error");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(mockSharp).toHaveBeenCalledTimes(1);
    });

    it("rejects responses whose Content-Length exceeds MAX_BLUR_SOURCE_BYTES", async () => {
      const url =
        "https://store.public.blob.vercel-storage.com/playgrounds/huge.jpg";
      const cancelSpy = vi.fn().mockResolvedValue(undefined);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          "content-length": String(MAX_BLUR_SOURCE_BYTES + 1),
        }),
        body: { cancel: cancelSpy },
      } as unknown as Response);

      const result = await generateBlurDataURL(url);

      expect(result).toBeNull();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(mockSharp).not.toHaveBeenCalled();
    });

    it("aborts streaming responses that exceed MAX_BLUR_SOURCE_BYTES without Content-Length", async () => {
      const url =
        "https://store.public.blob.vercel-storage.com/playgrounds/chunked-huge.jpg";
      const chunkSize = Math.ceil(MAX_BLUR_SOURCE_BYTES / 2) + 1024;
      let chunksSent = 0;
      const cancelSpy = vi.fn();

      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          chunksSent++;
          controller.enqueue(new Uint8Array(chunkSize));
          if (chunksSent >= 5) {
            controller.close();
          }
        },
        cancel() {
          cancelSpy();
        },
      });

      fetchMock.mockResolvedValue(
        new Response(stream, {
          status: 200,
        }),
      );

      const result = await generateBlurDataURL(url);

      expect(result).toBeNull();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(chunksSent).toBeLessThan(5);
      expect(mockSharp).not.toHaveBeenCalled();
    });
  });

  describe("buildBlurDataMap", () => {
    it("bounds concurrent fetches and preserves existing entries", async () => {
      let inFlight = 0;
      let maxInFlight = 0;

      fetchMock.mockImplementation(async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 15));
        inFlight--;
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
      });

      const urls = Array.from(
        { length: 8 },
        (_, i) =>
          `https://store.public.blob.vercel-storage.com/playgrounds/p-${i}.jpg`,
      );
      const existingUrl = urls[0]!;
      const staleUrl =
        "https://store.public.blob.vercel-storage.com/playgrounds/removed.jpg";

      const result = await buildBlurDataMap(
        [...urls, urls[1]!], // duplicate URL should only be fetched once
        {
          [existingUrl]: "data:image/jpeg;base64,EXISTING",
          [staleUrl]: "data:image/jpeg;base64,STALE",
        },
        2,
      );

      expect(maxInFlight).toBeLessThanOrEqual(2);
      expect(fetchMock).toHaveBeenCalledTimes(7); // 8 unique - 1 existing
      expect(result[existingUrl]).toBe("data:image/jpeg;base64,EXISTING");
      expect(result[staleUrl]).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(8);
    });
  });
});
