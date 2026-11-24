// Deliberately not marked `server-only`: the backfill script
// (`scripts/backfill-image-blur.ts`) reuses this outside the Next runtime. The
// `sharp` import keeps it server-side in practice.
import sharp from "sharp";

import { isAllowedRemoteImageUrl } from "~/lib/image-url";
import { logger } from "~/lib/logging/logger";

/**
 * Width of the generated placeholder. 20px keeps the base64 payload in the
 * few-hundred-byte range while still carrying the photo's colour composition —
 * `next/image` scales and blurs it up to the real image's box.
 */
const BLUR_WIDTH = 20;
const BLUR_QUALITY = 40;

/** Uploads can be large; a placeholder is never worth a long hang. */
export const FETCH_TIMEOUT_MS = 10_000;

/** Cap downloaded source image bytes to prevent memory exhaustion (OOM DoS). */
export const MAX_BLUR_SOURCE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Guard sharp against image decompression bombs. */
const MAX_INPUT_PIXELS = 40_000_000;

/** Maximum concurrent remote image fetches in `buildBlurDataMap`. */
export const BLUR_CONCURRENCY = 4;

/**
 * Streams a fetch response up to `maxBytes`, aborting early if the payload
 * exceeds the limit (via `Content-Length` or actual streamed byte count).
 */
async function readResponseWithLimit(
  response: Response,
  maxBytes: number,
): Promise<Buffer | null> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
  }

  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      return null;
    }
    return Buffer.from(arrayBuffer);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

/**
 * Build a `data:` URL placeholder for one image.
 *
 * Placeholders are decorative: every failure path returns null so a flaky blob
 * fetch or an unsupported format degrades to the current no-placeholder
 * behaviour instead of failing the upload or edit that triggered it.
 */
export async function generateBlurDataURL(
  imageUrl: string,
): Promise<string | null> {
  if (!isAllowedRemoteImageUrl(imageUrl)) {
    logger.warn("Rejected non-allowlisted URL for blur placeholder", {
      component: "ImageBlur",
      action: "generate_blur_rejected_url",
      metadata: { imageUrl },
    });
    return null;
  }

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "error",
    });

    if (!response.ok) {
      logger.warn("Blur placeholder source fetch failed", {
        component: "ImageBlur",
        action: "generate_blur_fetch_failed",
        metadata: { imageUrl, status: response.status },
      });
      return null;
    }

    const buffer = await readResponseWithLimit(response, MAX_BLUR_SOURCE_BYTES);
    if (!buffer) {
      logger.warn("Blur placeholder source exceeded max byte size", {
        component: "ImageBlur",
        action: "generate_blur_too_large",
        metadata: { imageUrl, maxBytes: MAX_BLUR_SOURCE_BYTES },
      });
      return null;
    }

    const placeholder = await sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .resize(BLUR_WIDTH, null, { fit: "inside" })
      .jpeg({ quality: BLUR_QUALITY })
      .toBuffer();

    return `data:image/jpeg;base64,${placeholder.toString("base64")}`;
  } catch (error) {
    logger.warn("Blur placeholder generation failed", {
      component: "ImageBlur",
      action: "generate_blur_failed",
      metadata: {
        imageUrl,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return null;
  }
}

/**
 * Build the URL-keyed placeholder map for a playground's images.
 *
 * `existing` is carried over so an edit that only adds or reorders photos does
 * not re-download and re-encode the ones that were already processed; entries
 * for URLs no longer in `imageUrls` are dropped.
 */
export async function buildBlurDataMap(
  imageUrls: string[],
  existing: Record<string, string> = {},
  concurrency = BLUR_CONCURRENCY,
): Promise<Record<string, string>> {
  const missing = [...new Set(imageUrls)].filter((url) => !existing[url]);
  const generated = new Map<string, string>();

  if (missing.length > 0) {
    const workerCount = Math.max(1, Math.min(concurrency, missing.length));
    let nextIndex = 0;

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < missing.length) {
          const url = missing[nextIndex++]!;
          const blur = await generateBlurDataURL(url);
          if (blur) {
            generated.set(url, blur);
          }
        }
      }),
    );
  }

  const blurMap: Record<string, string> = {};
  for (const url of imageUrls) {
    const blur = existing[url] ?? generated.get(url);
    if (blur) blurMap[url] = blur;
  }

  return blurMap;
}

/**
 * Placeholders for a playground's cover plus gallery in one pass, reusing any
 * already-generated entries. The cover is looked up in the same map so a cover
 * that is also in `images` is only ever encoded once.
 */
export async function buildPlaygroundBlurData(
  coverImage: string | null | undefined,
  images: string[],
  existing: Record<string, string> = {},
): Promise<{
  coverImageBlur: string | null;
  imageBlurData: Record<string, string>;
}> {
  const allUrls = [
    ...new Set([...(coverImage ? [coverImage] : []), ...images]),
  ].filter((url) => url.trim() !== "");

  const blurMap = await buildBlurDataMap(allUrls, existing);

  return {
    coverImageBlur: coverImage ? (blurMap[coverImage] ?? null) : null,
    imageBlurData: blurMap,
  };
}
