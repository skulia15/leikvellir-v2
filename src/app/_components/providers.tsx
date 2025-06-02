"use client";

import { SessionProvider } from "next-auth/react";
import { AdminProvider } from "~/lib/admin-context";
import { TRPCReactProvider } from "~/trpc/react";
import { type Session } from "next-auth";
import { ErrorProvider } from "./error-provider";
import { AppErrorBoundary } from "~/components/ui/error-boundary";
import { CSPostHogProvider } from "./posthog-provider";

interface ProvidersProps {
    children: React.ReactNode;
    session: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
    return (
        <AppErrorBoundary>
            <ErrorProvider>
                <CSPostHogProvider>
                    <SessionProvider session={session}>
                        <TRPCReactProvider>
                            <AdminProvider>
                                {children}
                            </AdminProvider>
                        </TRPCReactProvider>
                    </SessionProvider>
                </CSPostHogProvider>
            </ErrorProvider>
        </AppErrorBoundary>
    );
} 