import { Card } from "~/components/ui/card";

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className ?? ""}`} />;
}

export function PlaygroundCardSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-row gap-4">
        {/* Image skeleton */}
        <ShimmerBlock className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Title skeleton */}
          <ShimmerBlock className="h-5 sm:h-6 w-3/4 mb-2" />

          {/* Municipality skeleton */}
          <ShimmerBlock className="h-3.5 w-1/3 mb-3" />

          {/* Badges skeleton */}
          <div className="flex flex-wrap gap-1.5">
            <ShimmerBlock className="h-4 w-16 rounded-full" />
            <ShimmerBlock className="h-4 w-20 rounded-full" />
            <ShimmerBlock className="h-4 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlaygroundListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="">
      <div className="divide-y divide-border">
        {Array.from({ length: count }).map((_, index) => (
          <PlaygroundCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function PlaygroundGridCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-xl">
      <ShimmerBlock className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <ShimmerBlock className="h-5 w-3/4" />
        <ShimmerBlock className="h-4 w-1/2" />
        <div className="flex gap-3">
          <ShimmerBlock className="h-3.5 w-16" />
          <ShimmerBlock className="h-3.5 w-20" />
        </div>
      </div>
    </Card>
  );
}
