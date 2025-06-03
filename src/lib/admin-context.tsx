"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

interface AdminContextType {
    isAdminMode: boolean;
    toggleAdminMode: () => void;
    canAccessAdmin: boolean;
    userRole: string | null;
    isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const [isAdminMode, setIsAdminMode] = useState(false);
    const { data: session, status } = useSession();

    // Fetch current user data including role from database
    const { data: currentUser, isLoading: userLoading } = api.users.getCurrentUser.useQuery(
        undefined,
        {
            enabled: status === "authenticated" && !!session?.user,
            retry: false,
        }
    );

    const userRole = currentUser?.role ?? null;
    const canAccessAdmin = status === "authenticated" &&
        !!session?.user &&
        !!currentUser &&
        (currentUser.role === "admin" || currentUser.role === "super_admin") &&
        !currentUser.isBanned;

    const isLoading = status === "loading" || (status === "authenticated" && userLoading);

    // Load admin mode from localStorage on mount, with smart defaults for elevated users
    useEffect(() => {
        if (status === "authenticated" && session?.user && canAccessAdmin && currentUser) {
            const savedAdminMode = localStorage.getItem("adminMode");

            if (savedAdminMode !== null) {
                // User has explicitly set a preference - respect it
                setIsAdminMode(savedAdminMode === "true");
            } else {
                // No saved preference - default elevated users to admin mode
                const defaultToAdminMode = currentUser.role === "admin" || currentUser.role === "super_admin";
                setIsAdminMode(defaultToAdminMode);
                // Save this default choice
                localStorage.setItem("adminMode", defaultToAdminMode.toString());
            }
        } else {
            // Clear admin mode if user doesn't have admin permissions
            setIsAdminMode(false);
            localStorage.removeItem("adminMode");
        }
    }, [session, status, canAccessAdmin, currentUser]);

    const toggleAdminMode = () => {
        // Only allow toggling if user has admin permissions
        if (status !== "authenticated" || !session?.user || !canAccessAdmin || !currentUser) {
            return;
        }

        const newMode = !isAdminMode;
        setIsAdminMode(newMode);
        localStorage.setItem("adminMode", newMode.toString());
    };

    return (
        <AdminContext.Provider value={{
            isAdminMode,
            toggleAdminMode,
            canAccessAdmin,
            userRole,
            isLoading
        }}>
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error("useAdmin must be used within an AdminProvider");
    }
    return context;
} 