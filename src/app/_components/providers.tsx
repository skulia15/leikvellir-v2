"use client";

import { SessionProvider } from "next-auth/react";
import { AdminProvider } from "~/lib/admin-context";
import { type Session } from "next-auth";

interface ProvidersProps {
    children: React.ReactNode;
    session: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
    return (
        <SessionProvider session={session}>
            <AdminProvider>
                {children}
            </AdminProvider>
        </SessionProvider>
    );
} 