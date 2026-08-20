import { PlaygroundListSkeleton } from "./playground-card-skeleton";

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className ?? ""}`} />;
}

/**
 * Placeholder for the map-first home page. Rendered by `app/loading.tsx`, which
 * is the Suspense boundary that lets the shell stream before `getAll` resolves.
 *
 * The real layout switches on a JS `isMobile` check; here we use the equivalent
 * `md` breakpoint so nothing has to be measured before paint.
 */
export function HomeSkeleton() {
  return (
    <div className="relative flex" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Desktop sidebar — mirrors the 420px list column */}
      <div className="relative z-10 hidden w-[420px] flex-shrink-0 overflow-hidden bg-card shadow-lg md:block">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShimmerBlock className="h-5 w-8 rounded-full" />
            <ShimmerBlock className="h-4 w-40" />
          </div>
        </div>
        {/* Filter pill row */}
        <div className="flex flex-wrap gap-2 px-4 py-3">
          <ShimmerBlock className="h-8 w-24 rounded-full" />
          <ShimmerBlock className="h-8 w-20 rounded-full" />
          <ShimmerBlock className="h-8 w-28 rounded-full" />
        </div>
        <div className="px-4 pb-4">
          <PlaygroundListSkeleton count={6} />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1 animate-pulse bg-muted" />

      {/* Mobile bottom sheet peek */}
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-card pb-6 pt-3 shadow-lg md:hidden">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <PlaygroundListSkeleton count={3} />
      </div>
    </div>
  );
}
