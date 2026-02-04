"use client";

import { useState } from "react";
import { Plus, FileEdit, Eye, Edit, ExternalLink } from "lucide-react";
import Link from "next/link";
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
import SubmissionStatusBadge from "./submission-status-badge";
import ViewSubmissionDialog from "./view-submission-dialog";
import PlaygroundFormDialog from "~/components/playground-form-dialog";
import ViewEditSuggestionDialog from "./view-edit-suggestion-dialog";
import EditSuggestionDialog from "./edit-suggestion-dialog";
import { useT } from "~/lib/i18n";

// Type for edit suggestions
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
    // Relations
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

interface MySubmissionsClientProps {
    initialSubmissions: Playground[];
    initialEditSuggestions: PlaygroundEditSuggestion[];
}

export default function MySubmissionsClient({
    initialSubmissions: _initialSubmissions,
    initialEditSuggestions: _initialEditSuggestions,
}: MySubmissionsClientProps) {
    const t = useT();

    // Dialog states for playground submissions
    const [selectedSubmission, setSelectedSubmission] = useState<Playground | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Dialog states for edit suggestions
    const [selectedEditSuggestion, setSelectedEditSuggestion] = useState<PlaygroundEditSuggestion | null>(null);
    const [isViewSuggestionDialogOpen, setIsViewSuggestionDialogOpen] = useState(false);
    const [isEditSuggestionDialogOpen, setIsEditSuggestionDialogOpen] = useState(false);

    // Use tRPC queries with initial data
    const { data: submissions, refetch: refetchSubmissions } = api.playground.getMySubmissions.useQuery();
    const { data: editSuggestions, refetch: refetchEditSuggestions } = api.playground.getMyEditSuggestions.useQuery();

    const handleViewSubmission = (playground: Playground) => {
        setSelectedSubmission(playground);
        setIsViewDialogOpen(true);
    };

    const handleEditSubmission = (playground: Playground) => {
        setSelectedSubmission(playground);
        setIsEditDialogOpen(true);
    };

    const handleViewEditSuggestion = (suggestion: PlaygroundEditSuggestion) => {
        setSelectedEditSuggestion(suggestion);
        setIsViewSuggestionDialogOpen(true);
    };

    const handleEditEditSuggestion = (suggestion: PlaygroundEditSuggestion) => {
        setSelectedEditSuggestion(suggestion);
        setIsEditSuggestionDialogOpen(true);
    };

    const handleSubmissionUpdated = () => {
        void refetchSubmissions();
        setIsEditDialogOpen(false);
        setSelectedSubmission(null);
    };

    const handleEditSuggestionUpdated = () => {
        void refetchEditSuggestions();
        setIsEditSuggestionDialogOpen(false);
        setSelectedEditSuggestion(null);
    };

    const isLoading = !submissions || !editSuggestions;
    const totalSubmissions = (submissions?.length || 0) + (editSuggestions?.length || 0);

    if (isLoading) {
        return null;
    }

    if (totalSubmissions === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('mySubmissions.noSubmissions')}</h3>
                    <p className="text-muted-foreground mb-4">
                        {t('mySubmissions.noSubmissionsDescription')}
                    </p>
                    <Link href="/create-playground">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('mySubmissions.addPlayground')}
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="submissions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="submissions" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t('mySubmissions.myPlaygrounds')}
                        {submissions && submissions.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {submissions.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="edits" className="flex items-center gap-2">
                        <FileEdit className="h-4 w-4" />
                        {t('mySubmissions.myEditSuggestions')}
                        {editSuggestions && editSuggestions.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {editSuggestions.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* My Playground Submissions Tab */}
                <TabsContent value="submissions">
                    {!submissions || submissions.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Plus className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{t('mySubmissions.noSubmissions')}</h3>
                                <p className="text-muted-foreground mb-4">
                                    {t('mySubmissions.noSubmissionsDescription')}
                                </p>
                                <Link href="/create-playground">
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('mySubmissions.addPlayground')}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('mySubmissions.myPlaygrounds')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Desktop table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('playground.title')}</TableHead>
                                                <TableHead>{t('playground.municipality')}</TableHead>
                                                <TableHead>{t('admin.submittedOn')}</TableHead>
                                                <TableHead>{t('admin.status')}</TableHead>
                                                <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {submissions.map((playground) => (
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
                                                        <span className="text-sm">
                                                            {new Date(playground.createdAt).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <SubmissionStatusBadge status={playground.status} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {playground.status === "pending" && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEditSubmission(playground)}
                                                                >
                                                                    <Edit className="mr-1 h-3 w-3" />
                                                                    {t('mySubmissions.editSubmission')}
                                                                </Button>
                                                            )}
                                                            {playground.status === "approved" ? (
                                                                <Link href={`/playground/${playground.id}`}>
                                                                    <Button variant="default" size="sm">
                                                                        <ExternalLink className="mr-1 h-3 w-3" />
                                                                        {t('mySubmissions.viewPlayground')}
                                                                    </Button>
                                                                </Link>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleViewSubmission(playground)}
                                                                >
                                                                    <Eye className="mr-1 h-3 w-3" />
                                                                    {t('mySubmissions.viewSubmission')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile card list */}
                                <div className="md:hidden space-y-3">
                                    {submissions.map((playground) => (
                                        <div key={playground.id} className="rounded-xl border bg-card p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{playground.title}</div>
                                                    <div className="text-xs text-muted-foreground">ID #{playground.id}</div>
                                                </div>
                                                <SubmissionStatusBadge status={playground.status} />
                                            </div>
                                            <div className="text-sm">
                                                {playground.municipality ? (
                                                    <span>{playground.municipality}</span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">{t('admin.noMunicipality')}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{new Date(playground.createdAt).toLocaleDateString('en-GB')}</span>
                                            </div>
                                            {playground.status === "rejected" && playground.rejectionReason && (
                                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                                                    <span className="font-medium">{t('mySubmissions.rejectionReason')}:</span> {playground.rejectionReason}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 border-t pt-3">
                                                {playground.status === "pending" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditSubmission(playground)}
                                                    >
                                                        <Edit className="mr-1 h-3 w-3" />
                                                        {t('mySubmissions.editSubmission')}
                                                    </Button>
                                                )}
                                                {playground.status === "approved" ? (
                                                    <Link href={`/playground/${playground.id}`}>
                                                        <Button variant="default" size="sm">
                                                            <ExternalLink className="mr-1 h-3 w-3" />
                                                            {t('mySubmissions.viewPlayground')}
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewSubmission(playground)}
                                                    >
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        {t('mySubmissions.viewSubmission')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* My Edit Suggestions Tab */}
                <TabsContent value="edits">
                    {!editSuggestions || editSuggestions.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <FileEdit className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{t('mySubmissions.noEditSuggestions')}</h3>
                                <p className="text-muted-foreground">
                                    {t('mySubmissions.noEditSuggestionsDescription')}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('mySubmissions.myEditSuggestions')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Desktop table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('playground.title')}</TableHead>
                                                <TableHead>{t('admin.submittedOn')}</TableHead>
                                                <TableHead>{t('admin.status')}</TableHead>
                                                <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {editSuggestions.map((suggestion) => (
                                                <TableRow key={suggestion.id}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{suggestion.playground?.title}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                Suggestion #{suggestion.id}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {new Date(suggestion.createdAt).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <SubmissionStatusBadge status={suggestion.status} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {suggestion.status === "pending" && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEditEditSuggestion(suggestion)}
                                                                >
                                                                    <Edit className="mr-1 h-3 w-3" />
                                                                    {t('mySubmissions.editSubmission')}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleViewEditSuggestion(suggestion)}
                                                            >
                                                                <Eye className="mr-1 h-3 w-3" />
                                                                {t('mySubmissions.viewSubmission')}
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
                                    {editSuggestions.map((suggestion) => (
                                        <div key={suggestion.id} className="rounded-xl border bg-card p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{suggestion.playground?.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Suggestion #{suggestion.id}
                                                    </div>
                                                </div>
                                                <SubmissionStatusBadge status={suggestion.status} />
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{new Date(suggestion.createdAt).toLocaleDateString('en-GB')}</span>
                                            </div>
                                            {suggestion.status === "rejected" && suggestion.rejectionReason && (
                                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                                                    <span className="font-medium">{t('mySubmissions.rejectionReason')}:</span> {suggestion.rejectionReason}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 border-t pt-3">
                                                {suggestion.status === "pending" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditEditSuggestion(suggestion)}
                                                    >
                                                        <Edit className="mr-1 h-3 w-3" />
                                                        {t('mySubmissions.editSubmission')}
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewEditSuggestion(suggestion)}
                                                >
                                                    <Eye className="mr-1 h-3 w-3" />
                                                    {t('mySubmissions.viewSubmission')}
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

            {/* Dialogs for Playground Submissions */}
            {selectedSubmission && (
                <>
                    <ViewSubmissionDialog
                        playground={selectedSubmission}
                        open={isViewDialogOpen}
                        onOpenChange={setIsViewDialogOpen}
                    />
                    <PlaygroundFormDialog
                        playground={selectedSubmission}
                        open={isEditDialogOpen}
                        onOpenChange={setIsEditDialogOpen}
                        onSuccess={handleSubmissionUpdated}
                        mode="edit-pending"
                    />
                </>
            )}

            {/* Dialogs for Edit Suggestions */}
            {selectedEditSuggestion && (
                <>
                    <ViewEditSuggestionDialog
                        suggestion={selectedEditSuggestion}
                        open={isViewSuggestionDialogOpen}
                        onOpenChange={setIsViewSuggestionDialogOpen}
                    />
                    <EditSuggestionDialog
                        suggestion={selectedEditSuggestion}
                        open={isEditSuggestionDialogOpen}
                        onOpenChange={setIsEditSuggestionDialogOpen}
                        onSuccess={handleEditSuggestionUpdated}
                    />
                </>
            )}
        </div>
    );
}
