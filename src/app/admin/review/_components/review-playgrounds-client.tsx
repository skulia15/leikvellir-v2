"use client";

import { useState } from "react";
import { Clock, User, Check, Edit, FileEdit, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
import PlaygroundFormDialog from "~/components/playground-form-dialog";
import EditSuggestionReviewDialog from "../../review-edit-suggestions/_components/edit-suggestion-review-dialog";
import { useDateLocale, useT } from "~/lib/i18n";

// Type for edit suggestions - matches the interface from the edit suggestion dialog
interface PlaygroundEditSuggestion {
    id: number;
    playgroundId: number;
    status: "pending" | "approved" | "rejected";
    title?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    municipality?: string | null;
    publiclyAccessible?: boolean | null;
    toddlerFriendly?: boolean | null;
    isSchoolGround?: boolean | null;
    schoolType?: "preschool" | "elementary" | null;
    hasSeating?: boolean | null;
    hasPicnicTable?: boolean | null;
    hasFencing?: boolean | null;
    hasGarbageCan?: boolean | null;
    hasBathroomNearby?: boolean | null;
    hasSoftPlayArea?: boolean | null;
    coverImage?: string | null;
    images?: string[] | null;
    equipmentIds?: number[] | null;
    submitAnonymously?: boolean | null;
    createdById: string;
    createdAt: Date;
    reviewedById?: string | null;
    reviewedAt?: Date | null;
    rejectionReason?: string | null;
    // Relations
    playground?: Playground;
    createdBy: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface ReviewPlaygroundsClientProps {
    initialSubmissions: Playground[];
    initialEditSuggestions: PlaygroundEditSuggestion[];
}

export default function ReviewPlaygroundsClient({
    initialSubmissions: _initialSubmissions,
    initialEditSuggestions: _initialEditSuggestions,
}: ReviewPlaygroundsClientProps) {
    const [selectedPlayground, setSelectedPlayground] = useState<Playground | null>(null);
    const [selectedEditSuggestion, setSelectedEditSuggestion] = useState<{ suggestion: PlaygroundEditSuggestion, playground: Playground } | null>(null);
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const [isEditSuggestionDialogOpen, setIsEditSuggestionDialogOpen] = useState(false);
    const t = useT();
    const dateLocale = useDateLocale();

    // Use tRPC queries with initial data
    const { data: pendingSubmissions, refetch: refetchSubmissions } = api.playground.getPendingSubmissions.useQuery();
    const { data: pendingEditSuggestions, refetch: refetchEditSuggestions } = api.playground.getPendingEditSuggestions.useQuery();

    const reviewMutation = api.playground.review.useMutation({
        onSuccess: () => {
            toast.success(t('success.playgroundReviewed'));
            void refetchSubmissions();
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
        } catch {
            // Error handling is already done in the mutation onError
        }
    };

    const handleReview = (playground: Playground) => {
        setSelectedPlayground(playground);
        setIsReviewDialogOpen(true);
    };

    const handleEditSuggestionReview = (suggestion: PlaygroundEditSuggestion) => {
        if (suggestion.playground) {
            setSelectedEditSuggestion({ suggestion, playground: suggestion.playground });
            setIsEditSuggestionDialogOpen(true);
        }
    };

    const handleEditSuggestionReviewed = () => {
        void refetchEditSuggestions();
        setIsEditSuggestionDialogOpen(false);
        setSelectedEditSuggestion(null);
    };

    // Count changes in edit suggestion - only count fields that are both not null AND different from original
    const countChanges = (suggestion: PlaygroundEditSuggestion) => {
        if (!suggestion.playground) return 0;

        let count = 0;
        const playground = suggestion.playground;

        if (suggestion.title !== null && suggestion.title !== playground.title) count++;
        if (suggestion.latitude !== null && suggestion.latitude !== playground.latitude) count++;
        if (suggestion.longitude !== null && suggestion.longitude !== playground.longitude) count++;
        if (suggestion.municipality !== null && suggestion.municipality !== playground.municipality) count++;
        if (suggestion.publiclyAccessible !== null && suggestion.publiclyAccessible !== playground.publiclyAccessible) count++;
        if (suggestion.toddlerFriendly !== null && suggestion.toddlerFriendly !== playground.toddlerFriendly) count++;
        if (suggestion.isSchoolGround !== null && suggestion.isSchoolGround !== playground.isSchoolGround) count++;
        if (suggestion.schoolType !== null && suggestion.schoolType !== playground.schoolType) count++;
        if (suggestion.hasSeating !== null && suggestion.hasSeating !== playground.hasSeating) count++;
        if (suggestion.hasPicnicTable !== null && suggestion.hasPicnicTable !== playground.hasPicnicTable) count++;
        if (suggestion.hasFencing !== null && suggestion.hasFencing !== playground.hasFencing) count++;
        if (suggestion.hasGarbageCan !== null && suggestion.hasGarbageCan !== playground.hasGarbageCan) count++;
        if (suggestion.hasBathroomNearby !== null && suggestion.hasBathroomNearby !== playground.hasBathroomNearby) count++;
        if (suggestion.hasSoftPlayArea !== null && suggestion.hasSoftPlayArea !== playground.hasSoftPlayArea) count++;

        // Cover image changes - both addition and removal
        if (suggestion.coverImage !== null && suggestion.coverImage !== playground.coverImage) count++;
        // Explicit cover image removal (null value when original has a cover)
        else if (suggestion.coverImage === null && playground.coverImage) count++;

        // For arrays, compare content rather than just references
        if (suggestion.images !== null && suggestion.images !== undefined) {
            const origImages = playground.images || [];
            // Check for added images
            const hasNewImages = suggestion.images.some(img => !origImages.includes(img));
            if (hasNewImages) count++;

            // Check for removed images
            const hasRemovedImages = origImages.some(img => !suggestion.images!.includes(img));
            if (hasRemovedImages) count++;
        }

        if (suggestion.equipmentIds !== null && suggestion.equipmentIds !== undefined) {
            const origEquipmentIds = playground.playgroundEquipment?.map(pe => pe.equipmentId).sort() || [];
            const suggestedIds = [...suggestion.equipmentIds].sort();
            if (JSON.stringify(suggestedIds) !== JSON.stringify(origEquipmentIds)) count++;
        }

        return count;
    };

    const isLoading = !pendingSubmissions || !pendingEditSuggestions;
    const totalPending = (pendingSubmissions?.length || 0) + (pendingEditSuggestions?.length || 0);

    if (isLoading) {
        // Return null here - the loading.tsx file handles the skeleton
        return null;
    }

    if (totalPending === 0) {
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
                        {totalPending} {t('admin.pendingSubmissions')}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="submissions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="submissions" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        New Submissions
                        {pendingSubmissions && pendingSubmissions.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {pendingSubmissions.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="edits" className="flex items-center gap-2">
                        <FileEdit className="h-4 w-4" />
                        Edit Suggestions
                        {pendingEditSuggestions && pendingEditSuggestions.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {pendingEditSuggestions.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* New Playground Submissions Tab */}
                <TabsContent value="submissions">
                    {!pendingSubmissions || pendingSubmissions.length === 0 ? (
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
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('admin.newPlaygroundSubmissions')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Desktop table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('playground.title')}</TableHead>
                                                <TableHead>{t('playground.municipality')}</TableHead>
                                                <TableHead>{t('admin.submittedBy')}</TableHead>
                                                <TableHead>{t('admin.submittedOn')}</TableHead>
                                                <TableHead>{t('admin.status')}</TableHead>
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
                                                        <div className="text-sm font-medium">
                                                            {playground.municipality ? (
                                                                <span className="text-foreground">{playground.municipality}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">{t('admin.noMunicipality')}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm">
                                                                {playground.submitAnonymously
                                                                    ? t('playground.anonymousSubmission')
                                                                    : playground.createdBy?.name || playground.createdBy?.email || `${t('admin.userTable')} #${playground.createdById}`
                                                                }
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {new Date(playground.createdAt).toLocaleDateString(dateLocale)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                                                            {t('admin.pending')}
                                                        </Badge>
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
                                </div>

                                {/* Mobile card list */}
                                <div className="md:hidden space-y-3">
                                    {pendingSubmissions.map((playground) => (
                                        <div key={playground.id} className="rounded-xl border bg-card p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{playground.title}</div>
                                                    <div className="text-xs text-muted-foreground">ID #{playground.id}</div>
                                                </div>
                                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 flex-shrink-0">
                                                    {t('admin.pending')}
                                                </Badge>
                                            </div>
                                            <div className="text-sm">
                                                {playground.municipality ? (
                                                    <span>{playground.municipality}</span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">{t('admin.noMunicipality')}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    <span className="truncate">
                                                        {playground.submitAnonymously
                                                            ? t('playground.anonymousSubmission')
                                                            : playground.createdBy?.name || playground.createdBy?.email || `${t('admin.userTable')} #${playground.createdById}`
                                                        }
                                                    </span>
                                                </div>
                                                <span className="flex-shrink-0">{new Date(playground.createdAt).toLocaleDateString(dateLocale)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 border-t pt-3">
                                                <Button variant="outline" size="sm" onClick={() => handleReview(playground)} disabled={reviewMutation.isPending}>
                                                    <Edit className="mr-1 h-3 w-3" />
                                                    {t('admin.reviewButton')}
                                                </Button>
                                                <Button variant="default" size="sm" onClick={() => handleQuickApprove(playground)} disabled={reviewMutation.isPending}>
                                                    <Check className="mr-1 h-3 w-3" />
                                                    {t('admin.quickApprove')}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Edit Suggestions Tab */}
                <TabsContent value="edits">
                    {!pendingEditSuggestions || pendingEditSuggestions.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <Check className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{t('admin.noEditSuggestions')}</h3>
                                <p className="text-muted-foreground">
                                    {t('admin.allEditSuggestionsReviewed')}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('admin.editSuggestionSubmissions')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Desktop table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('admin.playground')}</TableHead>
                                                <TableHead>{t('admin.proposedChanges')}</TableHead>
                                                <TableHead>{t('admin.submittedBy')}</TableHead>
                                                <TableHead>{t('admin.submittedOn')}</TableHead>
                                                <TableHead>{t('admin.status')}</TableHead>
                                                <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingEditSuggestions.map((suggestion) => (
                                                <TableRow key={suggestion.id}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{suggestion.playground?.title}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                #{suggestion.playground?.id} • Suggestion #{suggestion.id}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {countChanges(suggestion)} changes proposed
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm">
                                                                {suggestion.submitAnonymously
                                                                    ? t('playground.anonymousSubmission')
                                                                    : suggestion.createdBy?.name || suggestion.createdBy?.email || `User #${suggestion.createdById}`
                                                                }
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {new Date(suggestion.createdAt).toLocaleDateString(dateLocale)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                                                            {t('admin.pending')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditSuggestionReview(suggestion)}
                                                        >
                                                            <Edit className="mr-1 h-3 w-3" />
                                                            {t('admin.reviewButton')}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile card list */}
                                <div className="md:hidden space-y-3">
                                    {pendingEditSuggestions.map((suggestion) => (
                                        <div key={suggestion.id} className="rounded-xl border bg-card p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{suggestion.playground?.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        #{suggestion.playground?.id} • Suggestion #{suggestion.id}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 flex-shrink-0">
                                                    {t('admin.pending')}
                                                </Badge>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {countChanges(suggestion)} changes proposed
                                            </Badge>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    <span className="truncate">
                                                        {suggestion.submitAnonymously
                                                            ? t('playground.anonymousSubmission')
                                                            : suggestion.createdBy?.name || suggestion.createdBy?.email || `User #${suggestion.createdById}`
                                                        }
                                                    </span>
                                                </div>
                                                <span className="flex-shrink-0">{new Date(suggestion.createdAt).toLocaleDateString(dateLocale)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 border-t pt-3">
                                                <Button variant="outline" size="sm" onClick={() => handleEditSuggestionReview(suggestion)}>
                                                    <Edit className="mr-1 h-3 w-3" />
                                                    {t('admin.reviewButton')}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Review Dialogs */}
            {selectedPlayground && (
                <PlaygroundFormDialog
                    playground={selectedPlayground}
                    open={isReviewDialogOpen}
                    onOpenChange={setIsReviewDialogOpen}
                    onSuccess={refetchSubmissions}
                    mode="review"
                />
            )}

            {selectedEditSuggestion && (
                <EditSuggestionReviewDialog
                    editSuggestion={selectedEditSuggestion.suggestion}
                    originalPlayground={selectedEditSuggestion.playground}
                    open={isEditSuggestionDialogOpen}
                    onOpenChange={setIsEditSuggestionDialogOpen}
                    onReview={handleEditSuggestionReviewed}
                />
            )}
        </div>
    );
}
