"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface AdminContextType {
    isAdminMode: boolean;
    toggleAdminMode: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
    const [isAdminMode, setIsAdminMode] = useState(false);
    const { data: session, status } = useSession();

    // Load admin mode from localStorage on mount, but only if user is authenticated
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const savedAdminMode = localStorage.getItem("adminMode");
            if (savedAdminMode === "true") {
                setIsAdminMode(true);
            }
        } else {
            // Clear admin mode if user is not authenticated
            setIsAdminMode(false);
            localStorage.removeItem("adminMode");
        }
    }, [session, status]);

    const toggleAdminMode = () => {
        // Only allow toggling if user is authenticated
        if (status !== "authenticated" || !session?.user) {
            return;
        }

        const newMode = !isAdminMode;
        setIsAdminMode(newMode);
        localStorage.setItem("adminMode", newMode.toString());
    };

    return (
        <AdminContext.Provider value={{ isAdminMode, toggleAdminMode }}>
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