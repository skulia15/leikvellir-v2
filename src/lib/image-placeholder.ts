import { type ImageProps } from "next/image";

import { type Playground } from "~/types";

type BlurProps = Pick<ImageProps, "placeholder" | "blurDataURL">;

/**
 * Spread onto a `next/image` to fade a stored low-quality placeholder up into
 * the real photo.
 *
 * Returns nothing when no placeholder exists — `placeholder="blur"` throws for
 * a remote `src` unless `blurDataURL` is set, and images uploaded before the
 * placeholder column existed have none until the backfill runs.
 */
export function blurPlaceholderProps(
  blurDataURL: string | null | undefined,
): BlurProps {
  return blurDataURL ? { placeholder: "blur", blurDataURL } : {};
}

/**
 * Placeholder for one image of a playground's gallery, keyed by its URL.
 *
 * Falls back to the cover placeholder when the per-image map is absent, which
 * is the normal case in map and list views: `getAll` ships `coverImageBlur` but
 * omits `imageBlurData`, so the first photo still fades in there.
 */
export function playgroundImageBlurProps(
  playground: Pick<
    Playground,
    "coverImage" | "coverImageBlur" | "imageBlurData"
  >,
  imageUrl: string | null | undefined,
): BlurProps {
  if (!imageUrl) return {};

  const blur =
    playground.imageBlurData?.[imageUrl] ??
    (imageUrl === playground.coverImage ? playground.coverImageBlur : null);

  return blurPlaceholderProps(blur);
}
