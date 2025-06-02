import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import UserManagementClient from "./_components/user-management-client";

export default async function UserManagementPage() {
    const session = await getServerAuthSession();

    if (!session?.user) {
        redirect("/signin");
    }

    // Check if user has super admin permissions
    let currentUser;
    try {
        currentUser = await api.users.getCurrentUser();
    } catch {
        redirect("/");
    }

    if (currentUser.role !== "super_admin") {
        redirect("/");
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">User Management</h1>
                <p className="text-muted-foreground">
                    Manage user roles and permissions across the platform.
                </p>
            </div>

            <UserManagementClient />
        </div>
    );
} 