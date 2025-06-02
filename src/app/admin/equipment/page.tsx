import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import EquipmentManagementClient from "./_components/equipment-management-client";

export default async function EquipmentManagementPage() {
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/signin");
    }

    // Get current user to check permissions
    const currentUser = await api.users.getCurrentUser();

    // Only admins and super admins can access equipment management
    if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
        redirect("/");
    }

    // Fetch equipment data for initial render
    const equipment = await api.equipment.getAllAdmin();

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{getTranslation(defaultLocale, 'admin.equipmentManagement')}</h1>
                <p className="text-muted-foreground">
                    {getTranslation(defaultLocale, 'admin.equipmentManagementDescription')}
                </p>
            </div>

            <EquipmentManagementClient initialData={equipment} />
        </div>
    );
} 