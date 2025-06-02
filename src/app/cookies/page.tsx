// app/cookies/page.tsx
import type { Metadata } from "next";
import CookieManagementPage from "./_components/cookie-management-client";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";

export const metadata: Metadata = {
    title: `${getTranslation(defaultLocale, 'cookies.cookieManagement')} | Leikvellir`,
    description: getTranslation(defaultLocale, 'cookies.manageCookiePreferences'),
};

export default function CookiesPage() {
    return <CookieManagementPage />;
}

// TypeScript declarations for global objects
declare global {
    interface Window {
        posthog?: {
            opt_in_capturing: () => void;
            opt_out_capturing: () => void;
        };
    }
}
