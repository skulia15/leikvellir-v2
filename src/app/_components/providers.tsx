"use client";

import { SessionProvider } from "next-auth/react";
import { AdminProvider } from "~/lib/admin-context";
import { LanguageProvider, type Locale } from "~/lib/i18n";
import { TRPCReactProvider } from "~/trpc/react";
import { ErrorProvider } from "./error-provider";
import { AppErrorBoundary } from "~/components/ui/error-boundary";
import { PostHogProvider } from "./posthog-provider";
import { MotionConfig } from "motion/react";

interface ProvidersProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function Providers({ children, initialLocale }: ProvidersProps) {
  return (
    <ErrorProvider>
      <LanguageProvider initialLocale={initialLocale}>
        <AppErrorBoundary>
          <PostHogProvider>
            <SessionProvider>
              <TRPCReactProvider>
                <AdminProvider>
                  {/* Respect prefers-reduced-motion for all motion/react animations */}
                  <MotionConfig reducedMotion="user">{children}</MotionConfig>
                </AdminProvider>
              </TRPCReactProvider>
            </SessionProvider>
          </PostHogProvider>
        </AppErrorBoundary>
      </LanguageProvider>
    </ErrorProvider>
  );
}
