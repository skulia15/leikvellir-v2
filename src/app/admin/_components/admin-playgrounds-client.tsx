"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Pencil, Trash2, Eye, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useT } from "~/lib/i18n";
import EditPlaygroundDialog from "./edit-playground-dialog";

export default function AdminPlaygroundsClient() {
    const [editingPlayground, setEditingPlayground] = useState<Playground | null>(null);
    const [playgrounds] = api.playground.getAllForAdmin.useSuspenseQuery();
    const utils = api.useUtils();
    const t = useT();

    const deletePlayground = api.playground.delete.useMutation({
        onSuccess: () => {
            toast.success(t('success.playgroundDeleted'));
            void utils.playground.getAllForAdmin.invalidate();
        },
        onError: (error) => {
            toast.error(t('admin.failedToDeletePlayground', { error: error.message }));
        },
    });

    const handleDelete = async (playground: Playground) => {
        try {
            await deletePlayground.mutateAsync({ id: playground.id });
        } catch {
            // Error handling is done in the mutation callbacks
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString();
    };

    const getStatusBadge = (status: Playground["status"]) => {
        switch (status) {
            case "approved":
                return <Badge variant="default" className="text-xs">{t('admin.approved')}</Badge>;
            case "pending":
                return <Badge variant="secondary" className="text-xs text-orange-600 bg-orange-100">{t('admin.pending')}</Badge>;
            case "rejected":
                return <Badge variant="destructive" className="text-xs">{t('admin.rejected')}</Badge>;
            default:
                return null;
        }
    };

    if (!playgrounds || playgrounds.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center">
                    <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-medium">{t('admin.noPlaygroundsFound')}</h3>
                    <p className="text-muted-foreground">
                        {t('admin.noPlaygroundsFoundDescription')}
                    </p>
                    <Button asChild className="mt-4">
                        <Link href="/create-playground">{t('admin.addFirstPlayground')}</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Count playgrounds by status
    const statusCounts = playgrounds.reduce((acc, playground) => {
        acc[playground.status] = (acc[playground.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{playgrounds.length}</div>
                        <p className="text-xs text-muted-foreground">{t('admin.totalPlaygrounds')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{statusCounts.approved || 0}</div>
                        <p className="text-xs text-muted-foreground">{t('admin.approved')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-600">{statusCounts.pending || 0}</div>
                        <p className="text-xs text-muted-foreground">{t('admin.pendingReview')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{statusCounts.rejected || 0}</div>
                        <p className="text-xs text-muted-foreground">{t('admin.rejected')}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{t('admin.allPlaygrounds')} ({playgrounds.length})</span>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline">
                                <Link href="/admin/review">{t('admin.reviewSubmissions')}</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/create-playground">{t('playground.addNewPlayground')}</Link>
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.name')}</TableHead>
                                    <TableHead>{t('playground.municipality')}</TableHead>
                                    <TableHead>{t('admin.status')}</TableHead>
                                    <TableHead>{t('admin.submittedBy')}</TableHead>
                                    <TableHead>{t('admin.created')}</TableHead>
                                    <TableHead>{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {playgrounds.map((playground) => (
                                    <TableRow key={playground.id}>
                                        <TableCell className="font-medium">
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
                                            <div className="flex flex-wrap gap-1">
                                                {getStatusBadge(playground.status)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                    {playground.createdBy?.name || playground.createdBy?.email || playground.createdById}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(playground.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link href={`/playground/${playground.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingPlayground(playground)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('playground.deletePlayground')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('admin.deletePlaygroundConfirmation', { title: playground.title })}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(playground)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                disabled={deletePlayground.isPending}
                                                            >
                                                                {deletePlayground.isPending ? t('actions.deleting') : t('common.delete')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            {editingPlayground && (
                <EditPlaygroundDialog
                    playground={editingPlayground}
                    open={!!editingPlayground}
                    onOpenChange={(open: boolean) => !open && setEditingPlayground(null)}
                    onPlaygroundDeleted={() => setEditingPlayground(null)}
                />
            )}
        </>
    );
} 