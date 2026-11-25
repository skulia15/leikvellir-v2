import { revalidatePath } from "next/cache";

/** How long public playground pages may be served from the ISR cache (seconds). */
export const PUBLIC_PAGE_REVALIDATE_SECONDS = 300;

/**
 * Purge ISR-cached public pages after a mutation changes approved playground/equipment data,
 * so visitors don't wait out the revalidate window. Outside a Next request (tests, scripts)
 * `revalidatePath` throws — that's safe to ignore there.
 */
export function revalidatePublicPlaygroundPages(playgroundId?: number) {
  try {
    revalidatePath("/");
    revalidatePath("/playgrounds");
    revalidatePath("/leiksvaedi/[slug]", "page");
    if (playgroundId !== undefined) {
      revalidatePath(`/playground/${playgroundId}`);
    } else {
      revalidatePath("/playground/[id]", "page");
    }
  } catch {
    // No Next.js request store available
  }
}
