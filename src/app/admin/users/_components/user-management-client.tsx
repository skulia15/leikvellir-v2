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
import { useT } from "~/lib/i18n";

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
    const t = useT();

    const utils = api.useUtils();

    const { data: users, isLoading } = api.users.getAll.useQuery();
    const { data: currentUser } = api.users.getCurrentUser.useQuery();

    const updateRoleMutation = api.users.updateRole.useMutation({
        onSuccess: () => {
            toast.success(t('success.userRoleUpdated'));
            void utils.users.getAll.invalidate();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const banUserMutation = api.users.banUser.useMutation({
        onSuccess: () => {
            toast.success(t('success.userBanned'));
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
            toast.success(t('success.userUnbanned'));
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
            toast.error(t('admin.provideBanReason'));
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
                        {t('admin.superAdmin')}
                    </Badge>
                );
            case "admin":
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {t('admin.admin')}
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {t('admin.userRole')}
                    </Badge>
                );
        }
    };

    const getStatusBadge = (user: User) => {
        if (user.isBanned) {
            return (
                <Badge variant="destructive" className="flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    {t('admin.banned')}
                </Badge>
            );
        }
        return (
            <Badge variant="default" className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {t('admin.active')}
            </Badge>
        );
    };

    if (isLoading) {
        return <div>{t('admin.loadingUsers')}</div>;
    }

    return (
        <div className="space-y-4">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('admin.userTable')}</TableHead>
                            <TableHead>{t('admin.email')}</TableHead>
                            <TableHead>{t('admin.role')}</TableHead>
                            <TableHead>{t('admin.status')}</TableHead>
                            <TableHead>{t('admin.joined')}</TableHead>
                            <TableHead>{t('admin.actions')}</TableHead>
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
                                                <div className="text-xs text-muted-foreground">{t('admin.youIndicator')}</div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">{user.email}</div>
                                    {user.email?.includes("@example.com") && (
                                        <Badge variant="outline" className="text-xs">
                                            {t('admin.demo')}
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
                                                    <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                                                    <SelectItem value="admin">{t('admin.admin')}</SelectItem>
                                                    <SelectItem value="super_admin">{t('admin.superAdmin')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(user)}</TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        {user.emailVerified?.toLocaleDateString('en-GB') ?? "Unknown"}
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
                                                        {t('admin.unban')}
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
                                                                {t('admin.banUser')}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t('admin.banUserTitle')}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t('admin.banUserDescription', { name: user.name ?? user.email })}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <Label htmlFor="banReason">{t('admin.reasonForBan')}</Label>
                                                                    <Input
                                                                        id="banReason"
                                                                        value={banReason}
                                                                        onChange={(e) => setBanReason(e.target.value)}
                                                                        placeholder={t('admin.enterBanReason')}
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
                                                                    {t('common.cancel')}
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={handleBanUser}
                                                                    disabled={!banReason.trim() || banUserMutation.isPending}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    {t('admin.banUser')}
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

            {/* Mobile card list */}
            <div className="md:hidden space-y-3">
                {users?.map((user) => (
                    <div key={user.id} className="rounded-xl border bg-card p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            {user.image && (
                                <Image
                                    src={user.image}
                                    alt={user.name ?? "User"}
                                    className="h-10 w-10 rounded-full"
                                    width={40}
                                    height={40}
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">
                                    {user.name ?? "Unknown"}
                                    {user.id === currentUser?.id && (
                                        <span className="text-xs text-muted-foreground ml-1">({t('admin.youIndicator')})</span>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user)}
                            {user.email?.includes("@example.com") && (
                                <Badge variant="outline" className="text-xs">{t('admin.demo')}</Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {t('admin.joined')}: {user.emailVerified?.toLocaleDateString('en-GB') ?? "Unknown"}
                        </div>
                        {user.id !== currentUser?.id && (
                            <div className="space-y-2 border-t pt-3">
                                <Select
                                    value={user.role}
                                    onValueChange={(newRole: UserRole) => handleRoleChange(user.id, newRole)}
                                    disabled={updateRoleMutation.isPending}
                                >
                                    <SelectTrigger className="w-full h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                                        <SelectItem value="admin">{t('admin.admin')}</SelectItem>
                                        <SelectItem value="super_admin">{t('admin.superAdmin')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {user.isBanned ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleUnbanUser(user.id)}
                                        disabled={unbanUserMutation.isPending}
                                    >
                                        <UserCheck className="h-4 w-4 mr-1" />
                                        {t('admin.unban')}
                                    </Button>
                                ) : (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => setSelectedUserId(user.id)}
                                                disabled={user.role === "super_admin"}
                                            >
                                                <Ban className="h-4 w-4 mr-1" />
                                                {t('admin.banUser')}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('admin.banUserTitle')}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t('admin.banUserDescription', { name: user.name ?? user.email })}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="banReasonMobile">{t('admin.reasonForBan')}</Label>
                                                    <Input
                                                        id="banReasonMobile"
                                                        value={banReason}
                                                        onChange={(e) => setBanReason(e.target.value)}
                                                        placeholder={t('admin.enterBanReason')}
                                                    />
                                                </div>
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => { setBanReason(""); setSelectedUserId(null); }}>
                                                    {t('common.cancel')}
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleBanUser}
                                                    disabled={!banReason.trim() || banUserMutation.isPending}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    {t('admin.banUser')}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 