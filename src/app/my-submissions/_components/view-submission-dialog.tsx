"use client";

import { AlertCircle, ExternalLink, MapPin, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
import { type Playground } from "~/types";
import SubmissionStatusBadge from "./submission-status-badge";

interface ViewSubmissionDialogProps {
    playground: Playground;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ViewSubmissionDialog({
    playground,
    open,
    onOpenChange,
}: ViewSubmissionDialogProps) {
    const t = useT();
    const validImages = (playground.images ?? []).filter(img => img && img.trim() !== "");
    const coverImage = playground.coverImage ?? validImages[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-xl">{playground.title}</DialogTitle>
                            <DialogDescription>
                                {t('mySubmissions.submissionDetails')} #{playground.id}
                            </DialogDescription>
                        </div>
                        <SubmissionStatusBadge status={playground.status} />
                    </div>
                </DialogHeader>

                {/* Status-specific message */}
                {playground.status === "pending" && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-orange-800">{t('mySubmissions.awaitingReview')}</p>
                            <p className="text-sm text-orange-700 mt-1">
                                {t('mySubmissions.awaitingReviewDescription')}
                            </p>
                        </div>
                    </div>
                )}

                {playground.status === "approved" && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium text-green-800">{t('mySubmissions.submissionApproved')}</p>
                            <p className="text-sm text-green-700 mt-1">
                                {t('mySubmissions.submissionApprovedDescription')}
                            </p>
                            <Link href={`/playground/${playground.id}`} className="inline-block mt-2">
                                <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {t('mySubmissions.viewPlayground')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {playground.status === "rejected" && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-red-800">{t('mySubmissions.submissionRejected')}</p>
                            {playground.rejectionReason && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-red-700">{t('mySubmissions.rejectionReason')}:</p>
                                    <p className="text-sm text-red-700 mt-1">{playground.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Separator />

                {/* Cover Image */}
                {coverImage && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                        <Image
                            src={coverImage}
                            alt={playground.title}
                            fill
                            className="object-cover"
                        />
                    </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('playground.municipality')}</p>
                        <p className="text-sm">{playground.municipality || t('admin.noMunicipality')}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('admin.submittedOn')}</p>
                        <p className="text-sm">{new Date(playground.createdAt).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('playground.coordinates')}</p>
                        <p className="text-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {playground.latitude.toFixed(5)}, {playground.longitude.toFixed(5)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('playground.photoCount')}</p>
                        <p className="text-sm">{validImages.length} {t('playground.photos')}</p>
                    </div>
                </div>

                <Separator />

                {/* Accessibility & Features */}
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('playground.features')}</p>
                    <div className="flex flex-wrap gap-2">
                        {playground.publiclyAccessible && (
                            <Badge variant="secondary">{t('playground.publiclyAccessible')}</Badge>
                        )}
                        {playground.toddlerFriendly && (
                            <Badge variant="secondary">{t('playground.toddlerFriendly')}</Badge>
                        )}
                        {playground.isSchoolGround && (
                            <Badge variant="secondary">
                                {t('playground.schoolGround')} ({playground.schoolType === "preschool" ? t('playground.preschool') : t('playground.elementary')})
                            </Badge>
                        )}
                        {playground.hasSeating && (
                            <Badge variant="outline">{t('amenities.hasSeating')}</Badge>
                        )}
                        {playground.hasPicnicTable && (
                            <Badge variant="outline">{t('amenities.hasPicnicTable')}</Badge>
                        )}
                        {playground.hasFencing && (
                            <Badge variant="outline">{t('amenities.hasFencing')}</Badge>
                        )}
                        {playground.hasGarbageCan && (
                            <Badge variant="outline">{t('amenities.hasGarbageCan')}</Badge>
                        )}
                        {playground.hasBathroomNearby && (
                            <Badge variant="outline">{t('amenities.hasBathroomNearby')}</Badge>
                        )}
                        {playground.hasSoftPlayArea && (
                            <Badge variant="outline">{t('amenities.hasSoftPlayArea')}</Badge>
                        )}
                    </div>
                </div>

                {/* Equipment */}
                {playground.playgroundEquipment && playground.playgroundEquipment.length > 0 && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">{t('playground.equipment')}</p>
                            <div className="flex flex-wrap gap-2">
                                {playground.playgroundEquipment.map((pe) => (
                                    <Badge key={pe.equipmentId} variant="outline">
                                        {pe.equipment.name?.is || pe.equipment.name?.en || "Equipment"}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* All Images */}
                {validImages.length > 1 && (
                    <>
                        <Separator />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">{t('playground.allPhotos')}</p>
                            <div className="grid grid-cols-3 gap-2">
                                {validImages.map((img, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                                        <Image
                                            src={img}
                                            alt={`${playground.title} - ${index + 1}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
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
