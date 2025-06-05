import { Skeleton } from "~/components/ui/skeleton";

export function PlaygroundCardSkeleton() {
  return (
    <div className="px-2 py-4">
      <div className="flex flex-row gap-4">
        {/* Image skeleton */}
        <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-md flex-shrink-0" />

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
