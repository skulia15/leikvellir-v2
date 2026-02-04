"use client";

import { Clock, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { useT } from "~/lib/i18n";
import SubmissionStatusBadge from "./submission-status-badge";

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
    updatedAt?: Date | null;
    playground?: {
        id: number;
        title: string;
        coverImage?: string | null;
    };
    suggestionEquipment?: Array<{
        equipmentId: number;
        equipment: {
            id: number;
            name: Record<string, string>;
            category: string;
        };
    }>;
}

interface ViewEditSuggestionDialogProps {
    suggestion: PlaygroundEditSuggestion;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ViewEditSuggestionDialog({
    suggestion,
    open,
    onOpenChange,
}: ViewEditSuggestionDialogProps) {
    const t = useT();

    // Count the proposed changes
    const getChanges = () => {
        const changes: { field: string; value: string }[] = [];

        if (suggestion.title !== null && suggestion.title !== undefined) {
            changes.push({ field: t('playground.title'), value: suggestion.title });
        }
        if (suggestion.municipality !== null && suggestion.municipality !== undefined) {
            changes.push({ field: t('playground.municipality'), value: suggestion.municipality || t('admin.noMunicipality') });
        }
        if (suggestion.latitude !== null && suggestion.longitude !== null) {
            changes.push({ field: t('playground.coordinates'), value: `${suggestion.latitude?.toFixed(5)}, ${suggestion.longitude?.toFixed(5)}` });
        }
        if (suggestion.publiclyAccessible !== null && suggestion.publiclyAccessible !== undefined) {
            changes.push({ field: t('playground.publiclyAccessible'), value: suggestion.publiclyAccessible ? t('common.yes') : t('common.no') });
        }
        if (suggestion.toddlerFriendly !== null && suggestion.toddlerFriendly !== undefined) {
            changes.push({ field: t('playground.toddlerFriendly'), value: suggestion.toddlerFriendly ? t('common.yes') : t('common.no') });
        }
        if (suggestion.isSchoolGround !== null && suggestion.isSchoolGround !== undefined) {
            changes.push({ field: t('playground.schoolGround'), value: suggestion.isSchoolGround ? t('common.yes') : t('common.no') });
        }
        if (suggestion.hasSeating !== null && suggestion.hasSeating !== undefined) {
            changes.push({ field: t('amenities.hasSeating'), value: suggestion.hasSeating ? t('common.yes') : t('common.no') });
        }
        if (suggestion.hasPicnicTable !== null && suggestion.hasPicnicTable !== undefined) {
            changes.push({ field: t('amenities.hasPicnicTable'), value: suggestion.hasPicnicTable ? t('common.yes') : t('common.no') });
        }
        if (suggestion.hasFencing !== null && suggestion.hasFencing !== undefined) {
            changes.push({ field: t('amenities.hasFencing'), value: suggestion.hasFencing ? t('common.yes') : t('common.no') });
        }
        if (suggestion.hasGarbageCan !== null && suggestion.hasGarbageCan !== undefined) {
            changes.push({ field: t('amenities.hasGarbageCan'), value: suggestion.hasGarbageCan ? t('common.yes') : t('common.no') });
        }
        if (suggestion.hasBathroomNearby !== null && suggestion.hasBathroomNearby !== undefined) {
            changes.push({ field: t('amenities.hasBathroomNearby'), value: suggestion.hasBathroomNearby ? t('common.yes') : t('common.no') });
        }
        if (suggestion.hasSoftPlayArea !== null && suggestion.hasSoftPlayArea !== undefined) {
            changes.push({ field: t('amenities.hasSoftPlayArea'), value: suggestion.hasSoftPlayArea ? t('common.yes') : t('common.no') });
        }
        if (suggestion.images !== null && suggestion.images !== undefined) {
            changes.push({ field: t('playground.photos'), value: `${suggestion.images.length} ${t('playground.photos')}` });
        }
        if (suggestion.equipmentIds !== null && suggestion.equipmentIds !== undefined) {
            changes.push({ field: t('playground.equipment'), value: `${suggestion.equipmentIds.length} items` });
        }

        return changes;
    };

    const changes = getChanges();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-xl">
                                {t('mySubmissions.editSuggestionFor')} {suggestion.playground?.title}
                            </DialogTitle>
                            <DialogDescription>
                                {t('mySubmissions.suggestionDetails')} #{suggestion.id}
                            </DialogDescription>
                        </div>
                        <SubmissionStatusBadge status={suggestion.status} />
                    </div>
                </DialogHeader>

                {/* Status-specific message */}
                {suggestion.status === "pending" && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-orange-800">{t('mySubmissions.awaitingReview')}</p>
                            <p className="text-sm text-orange-700 mt-1">
                                {t('mySubmissions.suggestionAwaitingReviewDescription')}
                            </p>
                        </div>
                    </div>
                )}

                {suggestion.status === "approved" && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium text-green-800">{t('mySubmissions.suggestionApproved')}</p>
                            <p className="text-sm text-green-700 mt-1">
                                {t('mySubmissions.suggestionApprovedDescription')}
                            </p>
                            <Link href={`/playground/${suggestion.playgroundId}`} className="inline-block mt-2">
                                <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {t('mySubmissions.viewPlayground')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {suggestion.status === "rejected" && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-red-800">{t('mySubmissions.suggestionRejected')}</p>
                            {suggestion.rejectionReason && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-red-700">{t('mySubmissions.rejectionReason')}:</p>
                                    <p className="text-sm text-red-700 mt-1">{suggestion.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Separator />

                {/* Submission Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('mySubmissions.targetPlayground')}</p>
                        <Link href={`/playground/${suggestion.playgroundId}`} className="text-sm text-primary hover:underline">
                            {suggestion.playground?.title}
                        </Link>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('admin.submittedOn')}</p>
                        <p className="text-sm">{new Date(suggestion.createdAt).toLocaleDateString('en-GB')}</p>
                    </div>
                </div>

                <Separator />

                {/* Proposed Changes */}
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">{t('mySubmissions.proposedChanges')}</p>
                    {changes.length > 0 ? (
                        <div className="space-y-2">
                            {changes.map((change, index) => (
                                <div key={index} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm font-medium">{change.field}</span>
                                    <span className="text-sm text-muted-foreground">{change.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('mySubmissions.noChanges')}</p>
                    )}
                </div>

                {/* Equipment changes */}
                {suggestion.suggestionEquipment && suggestion.suggestionEquipment.length > 0 && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">{t('mySubmissions.suggestedEquipment')}</p>
                            <div className="flex flex-wrap gap-2">
                                {suggestion.suggestionEquipment.map((se) => (
                                    <Badge key={se.equipmentId} variant="outline">
                                        {se.equipment.name?.is || se.equipment.name?.en || "Equipment"}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
