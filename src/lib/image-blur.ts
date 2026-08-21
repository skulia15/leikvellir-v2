// Deliberately not marked `server-only`: the backfill script
// (`scripts/backfill-image-blur.ts`) reuses this outside the Next runtime. The
// `sharp` import keeps it server-side in practice.
import sharp from "sharp";

import { logger } from "~/lib/logging/logger";

/**
 * Width of the generated placeholder. 20px keeps the base64 payload in the
 * few-hundred-byte range while still carrying the photo's colour composition —
 * `next/image` scales and blurs it up to the real image's box.
 */
const BLUR_WIDTH = 20;
const BLUR_QUALITY = 40;

/** Uploads can be large; a placeholder is never worth a long hang. */
const FETCH_TIMEOUT_MS = 10_000;

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
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn("Blur placeholder source fetch failed", {
        component: "ImageBlur",
        action: "generate_blur_fetch_failed",
        metadata: { imageUrl, status: response.status },
      });
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const placeholder = await sharp(buffer)
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
): Promise<Record<string, string>> {
  const missing = imageUrls.filter((url) => !existing[url]);

  const generated = await Promise.all(
    missing.map(async (url) => [url, await generateBlurDataURL(url)] as const),
  );

  const blurMap: Record<string, string> = {};
  for (const url of imageUrls) {
    const blur = existing[url] ?? generated.find(([u]) => u === url)?.[1];
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
