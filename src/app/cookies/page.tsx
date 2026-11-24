// app/cookies/page.tsx
import type { Metadata } from "next";
import CookieManagementPage from "./_components/cookie-management-client";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";

export const metadata: Metadata = generateSEOMetadata({
    title: `${getTranslation(defaultLocale, 'cookies.cookieManagement')} | Leiksvæði`,
    exactTitle: true,
    description: getTranslation(defaultLocale, 'cookies.manageCookiePreferences'),
    path: '/cookies',
});

export default function CookiesPage() {
    return <CookieManagementPage />;
}
