import { Skeleton } from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";

export function PlaygroundCardSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-row gap-4">
        {/* Image skeleton */}
        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-lg flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* Title skeleton */}
          <Skeleton className="h-5 sm:h-6 w-3/4 mb-2" />

          {/* Badges skeleton */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
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
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
    </Card>
  );
}
