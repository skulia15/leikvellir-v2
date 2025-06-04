import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function PlaygroundCardSkeleton() {
  return (
    <Card className="border-0 py-2">
      <CardContent className="py-0">
        <div className="flex flex-row gap-3">
          {/* Image skeleton */}
          <Skeleton className="h-20 w-20 rounded-md" />
          
          <div className="flex-1 min-w-0">
            {/* Title skeleton */}
            <Skeleton className="h-6 w-3/4 mb-2" />
            
            {/* Badges skeleton */}
            <div className="mt-2 flex flex-wrap gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlaygroundListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg">
          <PlaygroundCardSkeleton />
        </div>
      ))}
    </div>
  );
}
