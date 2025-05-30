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
import { Pencil, Trash2, Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import EditPlaygroundDialog from "./edit-playground-dialog";

export default function AdminPlaygroundsClient() {
    const [editingPlayground, setEditingPlayground] = useState<Playground | null>(null);
    const [playgrounds] = api.playground.getAllForAdmin.useSuspenseQuery();
    const utils = api.useUtils();

    const deletePlayground = api.playground.delete.useMutation({
        onSuccess: (data) => {
            toast.success(`Playground deleted successfully`);
            void utils.playground.getAllForAdmin.invalidate();
        },
        onError: (error) => {
            toast.error(`Failed to delete playground: ${error.message}`);
        },
    });

    const handleDelete = async (playground: Playground) => {
        try {
            await deletePlayground.mutateAsync({ id: playground.id });
        } catch (error) {
            // Error handling is done in the mutation callbacks
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString();
    };

    const formatCoordinates = (lat: number, lng: number) => {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    };

    const getStatusBadge = (status: Playground["status"]) => {
        switch (status) {
            case "approved":
                return <Badge variant="default" className="text-xs">Approved</Badge>;
            case "pending":
                return <Badge variant="secondary" className="text-xs text-orange-600 bg-orange-100">Pending</Badge>;
            case "rejected":
                return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
            default:
                return null;
        }
    };

    if (!playgrounds || playgrounds.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center">
                    <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-medium">No Playgrounds Found</h3>
                    <p className="text-muted-foreground">
                        There are no playgrounds in the system yet.
                    </p>
                    <Button asChild className="mt-4">
                        <Link href="/create-playground">Add First Playground</Link>
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
                        <p className="text-xs text-muted-foreground">Total Playgrounds</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{statusCounts.approved || 0}</div>
                        <p className="text-xs text-muted-foreground">Approved</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-600">{statusCounts.pending || 0}</div>
                        <p className="text-xs text-muted-foreground">Pending Review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{statusCounts.rejected || 0}</div>
                        <p className="text-xs text-muted-foreground">Rejected</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>All Playgrounds ({playgrounds.length})</span>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline">
                                <Link href="/admin/review">Review Submissions</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/create-playground">Add New Playground</Link>
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Features</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {playgrounds.map((playground) => (
                                    <TableRow key={playground.id}>
                                        <TableCell className="font-medium">
                                            {playground.title}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatCoordinates(playground.latitude, playground.longitude)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(playground.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {playground.toddlerFriendly && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Toddler Friendly
                                                    </Badge>
                                                )}
                                                {playground.publiclyAccessible && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Public Access
                                                    </Badge>
                                                )}
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
                                                            <AlertDialogTitle>Delete Playground</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete &quot;{playground.title}&quot;?
                                                                This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(playground)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                disabled={deletePlayground.isPending}
                                                            >
                                                                {deletePlayground.isPending ? "Deleting..." : "Delete"}
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