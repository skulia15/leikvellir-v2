"use client";

import { SessionProvider } from "next-auth/react";
import { AdminProvider } from "~/lib/admin-context";
import { LanguageProvider, type Locale } from "~/lib/i18n";
import { TRPCReactProvider } from "~/trpc/react";
import { type Session } from "next-auth";
import { ErrorProvider } from "./error-provider";
import { AppErrorBoundary } from "~/components/ui/error-boundary";
import { PostHogProvider } from "./posthog-provider";

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
  initialLocale?: Locale;
}

export function Providers({ children, session, initialLocale }: ProvidersProps) {
  return (
    <ErrorProvider>
      <LanguageProvider initialLocale={initialLocale}>
        <AppErrorBoundary>
          <PostHogProvider>
            <SessionProvider session={session}>
              <TRPCReactProvider>
                <AdminProvider>{children}</AdminProvider>
              </TRPCReactProvider>
            </SessionProvider>
          </PostHogProvider>
        </AppErrorBoundary>
      </LanguageProvider>
    </ErrorProvider>
  );
}
