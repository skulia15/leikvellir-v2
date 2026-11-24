import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function PlaygroundDetailSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header skeleton */}
            <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 lg:px-8 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <Skeleton className="h-4 w-12" />
                        </Button>
                    </div>
                </div>
                {/* Title skeleton */}
                <Skeleton className="h-8 w-64 mt-6" />
            </div>

            <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 lg:px-8 py-2">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
                    {/* Main Content skeleton */}
                    <div className="space-y-6">
                        {/* Image carousel skeleton — matches ImageCarousel responsive height */}
                        <Skeleton className="aspect-[4/3] sm:aspect-auto sm:h-[400px] md:h-[500px] lg:h-[600px] w-full rounded-2xl" />

                        {/* Playground information skeleton */}
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-48" />
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Distance skeleton */}
                                <div className="flex items-start gap-3">
                                    <Skeleton className="h-5 w-5 mt-0.5" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </div>

                                {/* Features section skeleton */}
                                <div className="space-y-4">
                                    <Skeleton className="h-6 w-56" />
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {Array.from({ length: 2 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <Skeleton className="h-5 w-5" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-5 w-24" />
                                                    <Skeleton className="h-4 w-40" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Amenities section skeleton */}
                                <div className="space-y-4">
                                    <Skeleton className="h-6 w-32" />
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <Skeleton className="h-5 w-5" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-5 w-28" />
                                                    <Skeleton className="h-4 w-36" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Equipment skeleton */}
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {Array.from({ length: 2 }).map((_, categoryIndex) => (
                                        <div key={categoryIndex} className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-5 w-5" />
                                                <Skeleton className="h-5 w-36" />
                                            </div>
                                            <div className="space-y-3 ml-8">
                                                {Array.from({ length: 3 }).map((_, itemIndex) => (
                                                    <div key={itemIndex} className="flex items-center gap-3 py-1.5">
                                                        <Skeleton className="h-8 w-8 rounded flex-shrink-0" />
                                                        <div className="flex-1 space-y-1">
                                                            <Skeleton className="h-4 w-24" />
                                                            <Skeleton className="h-3 w-32" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar skeleton */}
                    <div className="space-y-6">
                        {/* Map skeleton */}
                        <Card className="overflow-hidden border-border/60">
                            <CardHeader className="p-4 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Skeleton className="h-64 w-full rounded-none" />
                                <div className="p-4 flex gap-2">
                                    <Skeleton className="h-9 flex-1" />
                                    <Skeleton className="h-9 flex-1" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Additional info skeleton */}
                        <Card className="overflow-hidden border-border/60">
                            <CardHeader className="p-4 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <Skeleton className="h-5 w-36" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 px-4 pb-4 pt-0">
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex justify-between">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Nearby playgrounds skeleton */}
                        <Card className="overflow-hidden border-border/60">
                            <CardHeader className="p-4 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <Skeleton className="h-5 w-40" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/60">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                                            <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-20" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-border/60">
                                    <Skeleton className="h-9 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}