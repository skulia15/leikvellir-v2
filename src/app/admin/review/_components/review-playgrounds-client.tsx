"use client";

import { useState } from "react";
import { Clock, MapPin, User, Check, Edit } from "lucide-react";
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
import { useT } from "~/lib/i18n";

interface ReviewPlaygroundsClientProps {
    initialData: Playground[];
}

export default function ReviewPlaygroundsClient({
    initialData: _initialData,
}: ReviewPlaygroundsClientProps) {
    const [selectedPlayground, setSelectedPlayground] = useState<Playground | null>(null);
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const t = useT();

    // Use tRPC query with initial data
    const { data: pendingSubmissions, refetch } = api.playground.getPendingSubmissions.useQuery();

    const reviewMutation = api.playground.review.useMutation({
        onSuccess: () => {
            toast.success(t('success.playgroundReviewed'));
            void refetch();
            setIsReviewDialogOpen(false);
            setSelectedPlayground(null);
        },
        onError: (error) => {
            toast.error(error.message || t('admin.failedToReviewPlayground'));
        },
    });

    const handleQuickApprove = async (playground: Playground) => {
        try {
            await reviewMutation.mutateAsync({
                id: playground.id,
                action: "approve",
            });
        } catch (_error) {
            // Error handling is already done in the mutation onError
        }
    };

    const handleReview = (playground: Playground) => {
        setSelectedPlayground(playground);
        setIsReviewDialogOpen(true);
    };

    const formatCoordinates = (lat: number, lng: number) => {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    if (!pendingSubmissions) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <div className="text-muted-foreground">{t('admin.loadingPendingSubmissions')}</div>
                </CardContent>
            </Card>
        );
    }

    if (pendingSubmissions.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('admin.noPendingSubmissions')}</h3>
                    <p className="text-muted-foreground">
                        {t('admin.allSubmissionsReviewed')}
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
                        {t('admin.pendingSubmissions')}
                    </Badge>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.pendingSubmissions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('playground.title')}</TableHead>
                                <TableHead>{t('playground.location')}</TableHead>
                                <TableHead>{t('admin.submittedBy')}</TableHead>
                                <TableHead>{t('admin.submittedOn')}</TableHead>
                                <TableHead>{t('admin.features')}</TableHead>
                                <TableHead className="text-right">{t('admin.actions')}</TableHead>
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
                                                    {t('admin.publicBadge')}
                                                </Badge>
                                            )}
                                            {playground.toddlerFriendly && (
                                                <Badge variant="outline" className="text-xs">
                                                    {t('admin.toddlerBadge')}
                                                </Badge>
                                            )}
                                            {playground.images && playground.images.length > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    {t('admin.photosBadge', { count: playground.images.length })}
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
                                                {t('admin.reviewButton')}
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleQuickApprove(playground)}
                                                disabled={reviewMutation.isPending}
                                            >
                                                <Check className="mr-1 h-3 w-3" />
                                                {t('admin.quickApprove')}
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