// Stand-in for `sharp` in the Cloudflare Workers build (see next.config.ts).
// sharp is a native libvips binding and cannot run on Workers; callers in
// `~/lib/image-blur` already treat a throw as "no placeholder".
export default function sharpUnavailable(): never {
  throw new Error("sharp is not available on Cloudflare Workers");
}
