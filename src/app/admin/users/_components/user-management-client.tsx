"use client";

import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Shield, ShieldCheck, Ban, UserCheck, Crown } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { type UserRole } from "~/types";
import Image from "next/image";

// Define the user type based on the database schema
type User = {
    id: string;
    name: string | null;
    email: string;
    emailVerified: Date | null;
    image: string | null;
    role: UserRole;
    isBanned: boolean;
    bannedAt: Date | null;
    bannedById: string | null;
    banReason: string | null;
};

export default function UserManagementClient() {
    const [banReason, setBanReason] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const utils = api.useUtils();

    const { data: users, isLoading } = api.users.getAll.useQuery();
    const { data: currentUser } = api.users.getCurrentUser.useQuery();

    const updateRoleMutation = api.users.updateRole.useMutation({
        onSuccess: () => {
            toast.success("User role updated successfully");
            void utils.users.getAll.invalidate();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const banUserMutation = api.users.banUser.useMutation({
        onSuccess: () => {
            toast.success("User banned successfully");
            void utils.users.getAll.invalidate();
            setBanReason("");
            setSelectedUserId(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const unbanUserMutation = api.users.unbanUser.useMutation({
        onSuccess: () => {
            toast.success("User unbanned successfully");
            void utils.users.getAll.invalidate();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleRoleChange = (userId: string, newRole: UserRole) => {
        updateRoleMutation.mutate({ userId, role: newRole });
    };

    const handleBanUser = () => {
        if (!selectedUserId || !banReason.trim()) {
            toast.error("Please provide a ban reason");
            return;
        }

        banUserMutation.mutate({
            userId: selectedUserId,
            reason: banReason.trim(),
        });
    };

    const handleUnbanUser = (userId: string) => {
        unbanUserMutation.mutate({ userId });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "super_admin":
                return (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Super Admin
                    </Badge>
                );
            case "admin":
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        User
                    </Badge>
                );
        }
    };

    const getStatusBadge = (user: User) => {
        if (user.isBanned) {
            return (
                <Badge variant="destructive" className="flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    Banned
                </Badge>
            );
        }
        return (
            <Badge variant="default" className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Active
            </Badge>
        );
    };

    if (isLoading) {
        return <div>Loading users...</div>;
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users?.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    {user.image && (
                                        <Image
                                            src={user.image}
                                            alt={user.name ?? "User"}
                                            className="h-8 w-8 rounded-full"
                                            width={32}
                                            height={32}
                                        />
                                    )}
                                    <div>
                                        <div className="font-medium">{user.name ?? "Unknown"}</div>
                                        {user.id === currentUser?.id && (
                                            <div className="text-xs text-muted-foreground">(You)</div>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm">{user.email}</div>
                                {user.email?.includes("@example.com") && (
                                    <Badge variant="outline" className="text-xs">
                                        Demo
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {getRoleBadge(user.role)}
                                    {user.id !== currentUser?.id && (
                                        <Select
                                            value={user.role}
                                            onValueChange={(newRole: UserRole) =>
                                                handleRoleChange(user.id, newRole)
                                            }
                                            disabled={updateRoleMutation.isPending}
                                        >
                                            <SelectTrigger className="w-32 h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(user)}</TableCell>
                            <TableCell>
                                <div className="text-sm">
                                    {user.emailVerified?.toLocaleDateString() ?? "Unknown"}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {user.id !== currentUser?.id && (
                                        <>
                                            {user.isBanned ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUnbanUser(user.id)}
                                                    disabled={unbanUserMutation.isPending}
                                                >
                                                    <UserCheck className="h-4 w-4 mr-1" />
                                                    Unban
                                                </Button>
                                            ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setSelectedUserId(user.id)}
                                                            disabled={user.role === "super_admin"}
                                                        >
                                                            <Ban className="h-4 w-4 mr-1" />
                                                            Ban
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Ban User</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to ban {user.name ?? user.email}?
                                                                They will be unable to access the platform.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <Label htmlFor="banReason">Reason for ban</Label>
                                                                <Input
                                                                    id="banReason"
                                                                    value={banReason}
                                                                    onChange={(e) => setBanReason(e.target.value)}
                                                                    placeholder="Enter reason for banning this user..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel
                                                                onClick={() => {
                                                                    setBanReason("");
                                                                    setSelectedUserId(null);
                                                                }}
                                                            >
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={handleBanUser}
                                                                disabled={!banReason.trim() || banUserMutation.isPending}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Ban User
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 