import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { PlaygroundGridCardSkeleton } from "./playground-card-skeleton";

export function PlaygroundsPageSkeleton() {
    return (
        <div className="bg-background">
            <div className="container mx-auto py-6">
                {/* Header skeleton */}
                <div className="mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <Skeleton className="h-9 w-48 mb-2" />
                            <Skeleton className="h-5 w-64" />
                        </div>
                        <Skeleton className="h-10 w-36" />
                    </div>
                </div>

                {/* Sorting controls skeleton */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <Skeleton className="h-10 w-48" />
                            </div>
                            <Skeleton className="h-8 w-32" />
                        </div>
                    </CardContent>
                </Card>

                {/* Equipment filter pills skeleton */}
                <div className="flex gap-2 mb-6 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-8 w-28 rounded-full flex-shrink-0" />
                    ))}
                </div>

                {/* Count skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>

                {/* Playgrounds grid skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <PlaygroundGridCardSkeleton key={index} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function PlaygroundsListSkeleton() {
    return (
        <div className="space-y-6">
            {/* Sorting controls skeleton */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-10 w-48" />
                        </div>
                        <Skeleton className="h-8 w-32" />
                    </div>
                </CardContent>
            </Card>

            {/* Equipment filter pills skeleton */}
            <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-28 rounded-full flex-shrink-0" />
                ))}
            </div>

            {/* Count skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
            </div>

            {/* Playgrounds grid skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <PlaygroundGridCardSkeleton key={index} />
                ))}
            </div>
        </div>
    );
}
