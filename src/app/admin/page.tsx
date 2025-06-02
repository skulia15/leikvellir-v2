import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import AdminPlaygroundsClient from "./_components/admin-playgrounds-client";

export default async function AdminPage() {
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/signin");
    }

    // In development, allow any authenticated user
    // In production, you might want to check for admin role here

    // Prefetch playgrounds data
    void api.playground.getAll.prefetch();

    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="mb-2 text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage playgrounds in the system. You can edit details or remove playgrounds.
                    </p>
                </div>

                <AdminPlaygroundsClient />
            </div>
        </div>
    );
}

export const metadata = {
    title: "Admin Dashboard - Leikvellir",
    description: "Manage playgrounds and system settings.",
}; 