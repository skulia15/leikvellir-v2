"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, User, Eye, Check, X, Edit } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { toast } from "sonner";
import ReviewPlaygroundDialog from "./review-playground-dialog";

interface ReviewPlaygroundsClientProps {
    initialData: Playground[];
}

export default function ReviewPlaygroundsClient({
    initialData,
}: ReviewPlaygroundsClientProps) {
    const router = useRouter();
    const [selectedPlayground, setSelectedPlayground] = useState<Playground | null>(null);
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

    // Use tRPC query with initial data
    const { data: pendingSubmissions, refetch } = api.playground.getPendingSubmissions.useQuery(
        undefined,
        { initialData }
    );

    const reviewMutation = api.playground.review.useMutation({
        onSuccess: () => {
            toast.success("Playground reviewed successfully");
            refetch();
            setIsReviewDialogOpen(false);
            setSelectedPlayground(null);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to review playground");
        },
    });

    const handleQuickApprove = async (playground: Playground) => {
        await reviewMutation.mutateAsync({
            id: playground.id,
            action: "approve",
        });
    };

    const handleReview = (playground: Playground) => {
        setSelectedPlayground(playground);
        setIsReviewDialogOpen(true);
    };

    const formatCoordinates = (lat: number, lng: number) => {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    if (pendingSubmissions.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Pending Submissions</h3>
                    <p className="text-muted-foreground">
                        All playground submissions have been reviewed. Great job!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-orange-600 bg-orange-100">
                        <Clock className="mr-1 h-3 w-3" />
                        {pendingSubmissions.length} Pending
                    </Badge>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Playground</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Submitted By</TableHead>
                                <TableHead>Submitted On</TableHead>
                                <TableHead>Features</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingSubmissions.map((playground) => (
                                <TableRow key={playground.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{playground.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                ID #{playground.id}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                {formatCoordinates(playground.latitude, playground.longitude)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{playground.createdById}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">
                                            {new Date(playground.createdAt).toLocaleDateString()}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {playground.publiclyAccessible && (
                                                <Badge variant="outline" className="text-xs">
                                                    Public
                                                </Badge>
                                            )}
                                            {playground.toddlerFriendly && (
                                                <Badge variant="outline" className="text-xs">
                                                    Toddler
                                                </Badge>
                                            )}
                                            {playground.images && playground.images.length > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    {playground.images.length} Photos
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReview(playground)}
                                                disabled={reviewMutation.isPending}
                                            >
                                                <Edit className="mr-1 h-3 w-3" />
                                                Review
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleQuickApprove(playground)}
                                                disabled={reviewMutation.isPending}
                                            >
                                                <Check className="mr-1 h-3 w-3" />
                                                Quick Approve
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Review Dialog */}
            {selectedPlayground && (
                <ReviewPlaygroundDialog
                    playground={selectedPlayground}
                    open={isReviewDialogOpen}
                    onOpenChange={setIsReviewDialogOpen}
                    onReview={refetch}
                />
            )}
        </div>
    );
} 