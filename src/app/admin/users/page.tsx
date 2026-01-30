import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import UserManagementClient from "./_components/user-management-client";
import { getTranslation, defaultLocale } from "~/lib/i18n";

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
        <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold sm:text-3xl">{getTranslation(defaultLocale, 'admin.userManagement')}</h1>
                <p className="text-muted-foreground">
                    {getTranslation(defaultLocale, 'admin.userManagementDescription')}
                </p>
            </div>

            <UserManagementClient />
        </div>
    );
} 