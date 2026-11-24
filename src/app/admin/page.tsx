import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import { getTranslation, getServerLocale } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import AdminPlaygroundsClient from "./_components/admin-playgrounds-client";

export default async function AdminPage() {
    const locale = await getServerLocale();
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/signin");
    }

    // Only admins and super admins can access the admin dashboard
    const currentUser = await api.users.getCurrentUser();
    if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
        redirect("/");
    }

    // Prefetch playgrounds data
    void api.playground.getAll.prefetch();

    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
                <div className="mb-6">
                    <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{getTranslation(locale, 'admin.adminDashboard')}</h1>
                    <p className="text-muted-foreground">
                        {getTranslation(locale, 'admin.adminDashboardDescription')}
                    </p>
                </div>

                <AdminPlaygroundsClient />
            </div>
        </div>
    );
}

export const metadata: Metadata = {
    title: getTranslation(defaultLocale, 'admin.adminDashboardTitle'),
    description: getTranslation(defaultLocale, 'admin.adminDashboardMetaDescription'),
    robots: {
        index: false,
        follow: false,
    },
};