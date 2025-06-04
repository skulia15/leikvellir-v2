import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { PlaygroundCardSkeleton } from "./playground-card-skeleton";

export function PlaygroundsPageSkeleton() {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-6">
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

                {/* Count skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>

                {/* Playgrounds list skeleton */}
                <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <PlaygroundCardSkeleton key={index} />

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

            {/* Count skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
            </div>

            {/* Playgrounds list skeleton */}
            <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, index) => (
                    <PlaygroundCardSkeleton key={index} />

                ))}
            </div>
        </div>
    );
}
